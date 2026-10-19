import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      console.warn("[Transcribe] ❌ Không có file audio trong request");
      return NextResponse.json({ error: "Không tìm thấy file audio" }, { status: 400 });
    }

    console.log(`[Transcribe] ✅ Nhận audio: ${audioFile.type || "unknown"}, ${audioFile.size} bytes`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Transcribe] ❌ GEMINI_API_KEY chưa được cấu hình!");
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trong file .env.local hoặc Vercel Environment Variables." },
        { status: 500 }
      );
    }

    console.log("[Transcribe] 🔑 API key hợp lệ, đang gọi Gemini...");

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = buffer.toString("base64");
    // Lấy mimeType chuẩn (loại bỏ tham số như codecs=opus)
    const rawMime = audioFile.type || "audio/webm";
    const mimeType = rawMime.split(";")[0].trim() || "audio/webm";

    // Gọi Gemini 2.0 Flash REST API (hoặc fallback 1.5-flash nếu 2.0 chưa kích hoạt)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const promptText = `Bạn là hệ thống chuyển đổi giọng nói thành văn bản (Speech-to-Text) chuyên nghiệp dành cho phỏng vấn kỹ thuật và tuyển dụng.
Nhiệm vụ của bạn: Hãy nghe kỹ đoạn âm thanh tiếng Việt này và chuyển lời nói của ứng viên thành văn bản tiếng Việt chính xác 100%.

QUY TẮC QUAN TRỌNG:
1. Nhận diện chuẩn xác và bảo toàn các thuật ngữ công nghệ thông tin tiếng Anh (ví dụ: React, ReactJS, re-render, component, Profiler, useMemo, useCallback, state, props, hook, memo, CSS, API, bug, lag, Next.js, TypeScript, Micro-frontend, Frontend, SQL, B2B...).
2. Nếu người nói ngập ngừng hoặc có từ đệm ("à, ừm"), hãy lọc bỏ và giữ lại câu từ mạch lạc.
3. Nếu âm thanh quá nhỏ, tiếng ồn hoặc im lặng, chỉ trả về một khoảng trắng rỗng.
4. TUYỆT ĐỐI CHỈ TRẢ VỀ văn bản đã nhận diện, không thêm giải thích, không thêm dấu ngoặc kép hay lời mở đầu/kết thúc.`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[Transcribe] ⚠️ Gemini 2.0-flash lỗi (${response.status}), thử fallback 1.5-flash...`);
      // Nếu 2.0-flash lỗi, thử với 1.5-flash
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (!fallbackRes.ok) {
        const errText = await response.text();
        console.error("[Gemini ASR Error]:", errText);
        return NextResponse.json(
          { error: `Lỗi gọi Gemini API (${response.status}): ${errText}` },
          { status: response.status }
        );
      }

      const fallbackResult = await fallbackRes.json();
      const text = fallbackResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      console.log(`[Transcribe] ✅ Gemini 1.5-flash thành công: "${text.slice(0, 80)}..."`);
      return NextResponse.json({ text });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log(`[Transcribe] ✅ Gemini 2.0-flash thành công: "${text.slice(0, 80)}"`);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[Transcribe Route Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
