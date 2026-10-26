import { NextRequest, NextResponse } from "next/server";

interface EvaluateRequest {
  question: string;
  answerText: string;
  expected?: string[];
  jdSkills?: string[];
  cvSkills?: string[];
  conversationHistory?: Array<{ role: "interviewer" | "candidate"; content: string }>;
}

function stripAccents(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function calculateHeuristicScore(answerText: string, expected: string[] = []): number {
  const trimmed = answerText.trim();
  if (trimmed.length === 0) return 0;

  const lengthScore = Math.min(30, Math.floor(trimmed.length / 10) * 3);
  if (!expected || expected.length === 0) {
    return Math.min(100, lengthScore + Math.min(40, Math.floor(trimmed.length / 15) * 4));
  }

  const answerNorm = stripAccents(trimmed);
  const matched = expected.filter((k) => answerNorm.includes(stripAccents(k)));
  const keywordScore = Math.round((matched.length / expected.length) * 70);

  return Math.max(0, Math.min(100, lengthScore + keywordScore));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateRequest;
    const { question, answerText, expected = [], jdSkills = [], cvSkills = [], conversationHistory = [] } = body;

    if (!question) {
      return NextResponse.json({ error: "Thiếu trường 'question' trong request body" }, { status: 400 });
    }

    const trimmedAnswer = (answerText || "").trim();
    if (!trimmedAnswer) {
      return NextResponse.json({
        score: 0,
        feedback: "Ứng viên chưa cung cấp câu trả lời hoặc đã bỏ qua câu hỏi này.",
        correctedText: "",
        strengths: [],
        improvements: ["Cần chủ động đưa ra câu trả lời dựa trên kinh nghiệm thực tế."],
        nextQuestion: "Bạn có thể chia sẻ một dự án tiêu biểu mà bạn từng tham gia không?",
      });
    }

    // Gộp và làm sạch danh sách kỹ năng theo ngữ cảnh JD/CV
    const combinedSkills = Array.from(
      new Set(
        [...jdSkills, ...cvSkills, ...expected].filter((s) => typeof s === "string" && s.trim().length > 0)
      )
    );
    const skillsListText =
      combinedSkills.length > 0
        ? combinedSkills.join(", ")
        : "React, Next.js, TypeScript, JavaScript, Python, FastAPI, Docker, PostgreSQL, MySQL, Redis, AWS, Git, CI/CD, OOP, REST API";

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Nếu không có API Key, dùng heuristic scoring dự phòng
    if (!apiKey) {
      const fallbackScore = calculateHeuristicScore(trimmedAnswer, expected);
      return NextResponse.json({
        score: fallbackScore,
        feedback: `Câu trả lời có độ dài ${trimmedAnswer.length} ký tự. Đã nhận diện các từ khoá chuyên môn cơ bản.`,
        correctedText: trimmedAnswer,
        strengths: ["Phản hồi kịp thời trong thời gian quy định."],
        improvements: ["Có thể mở rộng thêm ví dụ dự án thực tế và số liệu định lượng."],
        nextQuestion: "Bạn đã từng xử lý khó khăn kỹ thuật nào tương tự trong thực tế chưa?",
      });
    }

    // Prompt chuẩn hóa và chấm điểm với STT Correction
    const systemPrompt = `Bạn là chuyên gia phỏng vấn kỹ thuật và tuyển dụng nhân sự cấp cao.

LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU ĐẦU VÀO (STT CORRECTION):
Câu trả lời của ứng viên được ghi nhận qua Web Speech API (tiếng Việt 'vi-VN'). Do đó, các thuật ngữ chuyên ngành tiếng Anh (ví dụ: React, Next.js, FastAPI, PostgreSQL, Docker, SOLID, OOP, hoặc các kỹ năng trong JD/CV: ${skillsListText}) có thể bị phiên âm sang tiếng Việt (ví dụ: "rì ác", "phát a pi ai", "pốt gre", v.v.) hoặc sai chính tả nhẹ.
Nhiệm vụ của bạn:
1. Tự động suy luận và chuẩn hóa ngầm các từ bị phiên âm về đúng thuật ngữ chuyên ngành dựa theo ngữ cảnh câu hỏi và danh sách kỹ năng (${skillsListText}).
2. Tuyệt đối KHÔNG trừ điểm ứng viên vì lỗi phiên âm của công cụ Speech-to-Text.
3. Đánh giá câu trả lời công tâm, đưa ra nhận xét ngắn gọn và sinh câu hỏi phỏng vấn tiếp theo.

THÔNG TIN ĐẦU VÀO:
- Câu hỏi phỏng vấn: ${question}
- Tiêu chí kỳ vọng (Rubric): ${expected.join("; ") || "Chưa có rubric cụ thể"}
- Kỹ năng mục tiêu (JD/CV): ${skillsListText}
- Câu trả lời của ứng viên: "${trimmedAnswer}"
${
  conversationHistory.length > 0
    ? `- Lịch sử các lượt trước: ${JSON.stringify(conversationHistory.slice(-4))}`
    : ""
}

HÃY ĐÁNH GIÁ VÀ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON (không bọc trong markdown code block, không thêm văn bản ngoài):
{
  "score": <Điểm từ 0 đến 100, số nguyên>,
  "feedback": "<Nhận xét công tâm, súc tích trong 2-3 câu về câu trả lời>",
  "correctedText": "<Văn bản câu trả lời sau khi chuẩn hóa thuật ngữ tiếng Anh>",
  "strengths": ["<Điểm mạnh 1>", "<Điểm mạnh 2>"],
  "improvements": ["<Điểm cần cải thiện 1>"],
  "nextQuestion": "<1 câu hỏi phỏng vấn tiếp theo gợi mở, bám sát chuyên môn>"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`[Evaluate] Gemini API returned status ${res.status}, using heuristic fallback.`);
      const fallbackScore = calculateHeuristicScore(trimmedAnswer, expected);
      return NextResponse.json({
        score: fallbackScore,
        feedback: "Đánh giá sơ bộ dựa trên độ phù hợp của từ khóa chuyên môn với câu hỏi.",
        correctedText: trimmedAnswer,
        strengths: ["Trả lời đúng trọng tâm câu hỏi"],
        improvements: ["Nên bổ sung thêm tình huống thực tế để tăng tính thuyết phục."],
        nextQuestion: "Bạn có thể chia sẻ thêm giải pháp thay thế cho tình huống này không?",
      });
    }

    const data = await res.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Làm sạch JSON markdown fence nếu có
    const cleanedJson = rawOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json({
        score: typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : calculateHeuristicScore(trimmedAnswer, expected),
        feedback: parsed.feedback || "Câu trả lời đáp ứng tốt yêu cầu câu hỏi.",
        correctedText: parsed.correctedText || trimmedAnswer,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        nextQuestion: parsed.nextQuestion || "Bạn có muốn bổ sung thêm chi tiết nào không?",
      });
    } catch {
      // Fallback nếu output LLM không đúng định dạng JSON
      const fallbackScore = calculateHeuristicScore(trimmedAnswer, expected);
      return NextResponse.json({
        score: fallbackScore,
        feedback: rawOutput.slice(0, 300) || "Câu trả lời đã được ghi nhận.",
        correctedText: trimmedAnswer,
        strengths: [],
        improvements: [],
        nextQuestion: "Bạn có câu hỏi nào cho người phỏng vấn không?",
      });
    }
  } catch (error) {
    console.error("[Interview Evaluate Route Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
