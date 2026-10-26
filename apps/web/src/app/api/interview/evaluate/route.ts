import { NextRequest, NextResponse } from "next/server";
import {
  normalizeTranscriptWithContext,
  stripDiacritics,
} from "@/utils/dynamicSpeechNormalizer";

/**
 * POST /api/interview/evaluate
 * Chấm câu trả lời phỏng vấn 100% cục bộ (không gọi LLM/API ngoài), chạy được
 * trên Next.js / Vercel Serverless và đúng cho cả 17 nhóm ngành vì mọi tiêu chí
 * đều lấy từ metadata của chính câu hỏi (expected / sample_answer / red_flags).
 *
 * Thang điểm 0–100:
 *   A. Phủ rubric expected[]              65đ (85đ nếu không có sample_answer)
 *   B. Tương đồng sample_answer (cosine)  20đ
 *   C. Độ sâu, ví dụ cụ thể, lập luận      15đ
 *   D. Vi phạm red_flags[]                 −15đ / lỗi
 */

interface EvaluateBody {
  question?: string;
  answer?: string;
  /** Tên cũ — giữ để tương thích ngược. */
  answerText?: string;
  expected?: unknown;
  sample_answer?: string;
  red_flags?: unknown;
  skill_tag?: string;
  jd_skills?: unknown;
}

// ─── Hàm hỗ trợ NLP tiếng Việt ───────────────────────────────────────────────

const FILLERS = new Set(["ờ", "à", "ừm", "thì", "là", "mà", "của", "những", "các"]);

// Hư từ / từ chỉ thị (đã bỏ dấu) — không mang nội dung khi so khớp tiêu chí.
const STOP = new Set([
  "va", "voi", "de", "cho", "co", "duoc", "trong", "khi", "nhu", "mot", "nay",
  "do", "cac", "nhung", "ban", "hay", "nen", "can", "phai", "neu", "ro", "da",
  "se", "rat", "la", "thi", "ma", "cua", "o", "a", "um", "khong", "vao", "ra",
  "den", "tu", "theo", "tren", "duoi", "cung", "hoac", "bang", "tai", "ve",
]);

function normalizeVi(str: string): string {
  return (str || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAccent(str: string): string {
  return stripDiacritics(str);
}

/** Tách từ sau khi bỏ từ đệm (giữ dấu). */
function tokenizeWords(str: string): string[] {
  return normalizeVi(str)
    .split(" ")
    .filter((w) => w && !FILLERS.has(w));
}

/** Token nội dung, bỏ dấu, bỏ hư từ — dùng để so khớp. */
function contentTokens(str: string): string[] {
  return tokenizeWords(str)
    .map(stripAccent)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function extractNgrams(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}

function tokenFound(token: string, set: Set<string>, tokens: string[]): boolean {
  if (set.has(token)) return true;
  if (token.length < 5) return false;
  // Khớp gốc từ (vd "toi uu" ~ "toi uu hoa", "refactor" ~ "refactoring")
  return tokens.some((a) => a.length >= 5 && (a.startsWith(token) || token.startsWith(a)));
}

/**
 * Mức độ câu trả lời đáp ứng 1 tiêu chí (0.0 → 1.0): kết hợp chứa nguyên cụm,
 * trùng token không dấu, và độ phủ bigram.
 */
function computeCriterionMatchScore(answerText: string, criterionText: string): number {
  const ansNorm = stripAccent(normalizeVi(answerText));
  const critNorm = stripAccent(normalizeVi(criterionText));
  if (!ansNorm || !critNorm) return 0;
  if (ansNorm.includes(critNorm)) return 1;

  const ansTokens = contentTokens(answerText);
  const ansSet = new Set(ansTokens);
  const ansBigrams = new Set(extractNgrams(ansTokens, 2));

  // Ý chính: tách tiêu chí theo , ; / hoặc - ( ) :
  const concepts = criterionText
    .split(/[,;/()\-–:]|\s+hoặc\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);
  const conceptScores: number[] = [];
  for (const concept of concepts) {
    const toks = contentTokens(concept);
    if (toks.length === 0) continue;
    if (ansNorm.includes(stripAccent(normalizeVi(concept)))) {
      conceptScores.push(1);
      continue;
    }
    const found = toks.filter((t) => tokenFound(t, ansSet, ansTokens)).length;
    conceptScores.push(found / toks.length);
  }
  const conceptCoverage = conceptScores.length
    ? conceptScores.reduce((a, b) => a + b, 0) / conceptScores.length
    : 0;

  const critTokens = contentTokens(criterionText);
  const overlapAll = critTokens.length
    ? critTokens.filter((t) => tokenFound(t, ansSet, ansTokens)).length / critTokens.length
    : 0;

  const critBigrams = extractNgrams(critTokens, 2);
  const bigramCoverage = critBigrams.length
    ? critBigrams.filter((g) => ansBigrams.has(g)).length / critBigrams.length
    : overlapAll;

  return Math.min(1, Math.max(0, 0.45 * conceptCoverage + 0.35 * overlapAll + 0.2 * bigramCoverage));
}

function termFrequency(text: string): Map<string, number> {
  const toks = contentTokens(text);
  const tf = new Map<string, number>();
  for (const t of [...toks, ...extractNgrams(toks, 2)]) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/** Cosine similarity trên vector TF của unigram + bigram. */
function computeCosineSimilarity(textA: string, textB: string): number {
  const a = termFrequency(textA);
  const b = termFrequency(textB);
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  for (const [t, c] of a) dot += c * (b.get(t) ?? 0);
  let na = 0;
  for (const c of a.values()) na += c * c;
  let nb = 0;
  for (const c of b.values()) nb += c * c;
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
}

// ─── Độ sâu & lập luận ───────────────────────────────────────────────────────

const REASONING_MARKERS = [
  "ví dụ", "cụ thể", "kết quả", "giải pháp", "nguyên nhân", "bởi vì",
  "kinh nghiệm", "dự án",
];

function computeDepthScore(text: string): number {
  const words = tokenizeWords(text).length;
  const lengthFactor = words < 5 ? 0 : words < 10 ? 0.2 : words < 25 ? 0.2 + (0.8 * (words - 10)) / 15 : 1;
  const norm = normalizeVi(text);
  let markers = REASONING_MARKERS.filter((m) => norm.includes(m)).length;
  if (/\d/.test(text) || text.includes("%")) markers += 1;
  const markerFactor = Math.min(1, markers / 3);
  return 15 * (0.7 * lengthFactor + 0.3 * markerFactor);
}

function shorten(s: string, max = 90): string {
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

function listItems(items: string[], max = 3): string {
  return items.slice(0, max).map((i) => `“${shorten(i)}”`).join("; ");
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateBody;
    const question = (body.question || "").trim();
    const answer = (body.answer ?? body.answerText ?? "").trim();
    const expected = asStringArray(body.expected);
    const redFlags = asStringArray(body.red_flags);
    const jdSkills = asStringArray(body.jd_skills);
    const sampleAnswer = (body.sample_answer || "").trim();
    const skillTag = (body.skill_tag || "").trim();

    if (!question) {
      return NextResponse.json({ error: "Thiếu trường 'question' trong request body" }, { status: 400 });
    }

    if (!answer) {
      return NextResponse.json({
        score: 0,
        correctedText: "",
        feedback: "Nhận xét tổng quan: Bạn chưa đưa ra câu trả lời nào cho câu hỏi này.",
        matchedExpected: [],
        missingExpected: expected,
        triggeredRedFlags: [],
      });
    }

    // 1. Chuẩn hóa thuật ngữ bị phiên âm theo ngữ cảnh câu hỏi
    const correctedText = normalizeTranscriptWithContext(answer, {
      question,
      skill_tag: skillTag,
      expected,
      sample_answer: sampleAnswer,
      red_flags: redFlags,
      jd_skills: jdSkills,
    });

    // 2. Trọng số theo dữ liệu rubric thực có của câu hỏi
    const hasExpected = expected.length > 0;
    const hasSample = sampleAnswer.length > 0;
    const weightA = hasExpected ? (hasSample ? 65 : 85) : 0;
    const weightB = hasSample ? (hasExpected ? 20 : 70) : 0;
    const weightRel = !hasExpected && !hasSample ? 55 : !hasExpected ? 15 : 0;
    const weightSkill = !hasExpected && !hasSample ? 30 : 0;

    // A. Phủ rubric expected[]
    const matchedExpected: string[] = [];
    const partiallyMatched: string[] = [];
    const missingExpected: string[] = [];
    let creditSum = 0;
    for (const item of expected) {
      const m = computeCriterionMatchScore(correctedText, item);
      if (m >= 0.42) {
        matchedExpected.push(item);
        creditSum += 1;
      } else if (m >= 0.22) {
        partiallyMatched.push(item);
        creditSum += 0.5;
      } else {
        missingExpected.push(item);
      }
    }
    const rubricPoints = hasExpected ? weightA * (creditSum / expected.length) : 0;

    // B. Tương đồng sample_answer: [0.10 → 0.65] → [0 → weightB]
    let samplePoints = 0;
    if (hasSample) {
      const sim = computeCosineSimilarity(correctedText, sampleAnswer);
      samplePoints = weightB * clamp01((sim - 0.1) / (0.65 - 0.1));
    }

    // R. Không có rubric đầy đủ → dùng độ liên quan tới câu hỏi + kỹ năng mục tiêu
    let relevancePoints = 0;
    if (weightRel > 0) {
      const rel = clamp01((computeCosineSimilarity(correctedText, question) - 0.05) / 0.35);
      relevancePoints += weightRel * rel;
    }
    if (weightSkill > 0) {
      const skills = [skillTag, ...jdSkills].filter(Boolean);
      const cov = skills.length
        ? skills.filter((s) => computeCriterionMatchScore(correctedText, s) >= 0.42).length / skills.length
        : 0.5;
      relevancePoints += weightSkill * cov;
    }

    // C. Độ sâu, ví dụ cụ thể, lập luận
    const depthPoints = computeDepthScore(correctedText);

    // D. Vi phạm red_flags[]
    const triggeredRedFlags = redFlags.filter(
      (flag) => computeCriterionMatchScore(correctedText, flag) >= 0.6
    );
    const penalty = triggeredRedFlags.length * 15;

    const score = Math.round(
      Math.min(100, Math.max(0, rubricPoints + samplePoints + relevancePoints + depthPoints - penalty))
    );

    // 3. Nhận xét tiếng Việt
    const tier =
      score >= 80
        ? "Xuất sắc, bạn nắm vững chuyên môn."
        : score >= 60
        ? "Khá tốt, bạn đi đúng trọng tâm."
        : score >= 40
        ? "Bạn đã chạm tới một số ý cơ bản nhưng cần đào sâu hơn."
        : "Câu trả lời còn sơ sài hoặc chưa trúng trọng tâm.";

    const parts = [`Nhận xét tổng quan: ${tier}`];
    if (matchedExpected.length) {
      parts.push(`Điểm mạnh: Bạn đã đề cập tốt các ý trọng tâm: ${listItems(matchedExpected)}.`);
    }
    const toImprove = [...partiallyMatched, ...missingExpected];
    if (toImprove.length) {
      parts.push(`Điểm cần bổ sung: Để câu trả lời thuyết phục hơn, bạn nên làm rõ thêm: ${listItems(toImprove)}.`);
    }
    if (triggeredRedFlags.length) {
      parts.push(`Cảnh báo: Lưu ý tránh: ${listItems(triggeredRedFlags)}.`);
    }
    if (tokenizeWords(correctedText).length < 10) {
      parts.push("Gợi ý: Hãy trả lời chi tiết hơn, nêu ví dụ cụ thể hoặc số liệu từ kinh nghiệm thực tế.");
    }
    if (correctedText !== answer) {
      parts.push("Ghi chú: Hệ thống đã tự chuẩn hóa các thuật ngữ bị phiên âm bằng giọng nói; bạn không bị trừ điểm vì lỗi nhận diện.");
    }

    return NextResponse.json({
      score,
      correctedText,
      feedback: parts.join("\n"),
      matchedExpected,
      missingExpected,
      triggeredRedFlags,
      partiallyMatched,
    });
  } catch (error) {
    console.error("[Interview Evaluate Route Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
