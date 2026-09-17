"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useVoiceToText } from "./useVoiceToText";

const TIME_PER_QUESTION_SEC = 180; // 3 phút / câu
const FULL_SCORE_WINDOW_SEC = 60; // phút đầu — điểm tính đầy đủ, không giảm
const MIN_TIME_MULTIPLIER = 0.5; // sàn giảm điểm ở cuối phút thứ 3 (giây 180)
const TOTAL_QUESTIONS = 5;

type ApiQuestion = {
  id: string;
  category: string;
  duration: string;
  weight: string;
  question: string;
  expected: string[];
  redFlags: string[];
};

type AnswerOutcome = "submitted" | "timeout" | "skipped";

type AnswerRecord = {
  question_id: string;
  category: string;
  question: string;
  expected: string[];
  red_flags: string[];
  time_limit_sec: number;
  time_used_sec: number;
  answer_text: string;
  question_score: number;
  outcome: AnswerOutcome;
  answered_at: string;
};

// Hệ số giảm điểm theo thời gian dùng thật của câu trả lời:
// 0–60s (phút đầu): hệ số 1 — điểm tính đầy đủ theo scoreAnswer().
// 60–180s (phút 2–3): giảm dần tuyến tính từ 1 xuống MIN_TIME_MULTIPLIER.
// Hết giờ hoàn toàn (>=180s, không nộp) không đi qua hàm này — bị loại (0đ) ở goToNext.
function timeMultiplier(timeUsedSec: number): number {
  if (timeUsedSec <= FULL_SCORE_WINDOW_SEC) return 1;
  if (timeUsedSec >= TIME_PER_QUESTION_SEC) return MIN_TIME_MULTIPLIER;
  const t = (timeUsedSec - FULL_SCORE_WINDOW_SEC) / (TIME_PER_QUESTION_SEC - FULL_SCORE_WINDOW_SEC);
  return 1 - t * (1 - MIN_TIME_MULTIPLIER);
}

// Bỏ dấu tiếng Việt để so khớp từ khoá được rộng rãi hơn.
// "đ"/"Đ" không tách được bằng NFD (không phải base + combining-mark),
// phải thay thế trực tiếp trước khi normalize — bug đã gặp và fix ở backend,
// áp dụng lại đúng cách ở đây.
function stripAccents(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set([
  "hãy", "yêu", "cầu", "ứng", "viên", "anh", "chị", "bạn", "cần", "phải",
  "của", "trong", "khi", "như", "thế", "nào", "được", "một", "các", "những",
  "này", "đó", "với", "cho", "và", "hoặc", "về", "để", "vào", "trên", "dưới",
  "have", "with", "that", "this", "from", "your", "what", "when", "will",
]);

// Trích các từ khoá "có nghĩa" (đủ dài, không phải hư từ) từ danh sách tiêu chí
// kỳ vọng thật (do pipeline M1/M2/M3 sinh ra từ đúng CV/JD của ứng viên này).
function extractKeywords(text: string): string[] {
  const normalized = stripAccents(text);
  const words = normalized.match(/[a-z0-9+#./-]{4,}/g) || [];
  return Array.from(new Set(words.filter((w) => !STOPWORDS.has(w))));
}

// Chấm điểm câu trả lời — heuristic dựa trên rubric thật (expected) của chính
// câu hỏi này, KHÔNG gọi AI/API ngoài (đúng ràng buộc của đồ án).
function scoreAnswer(answerText: string, expected: string[]): number {
  const trimmed = answerText.trim();
  if (trimmed.length === 0) return 0;

  // Điểm cho việc trả lời có nội dung thực chất (tối đa 30đ, bão hoà ở ~100 ký tự)
  const lengthScore = Math.min(30, Math.floor(trimmed.length / 10) * 3);

  // Điểm khớp từ khoá với tiêu chí kỳ vọng (tối đa 70đ)
  const keywords = extractKeywords(expected.join(" "));
  let keywordScore = 0;
  if (keywords.length > 0) {
    const answerNorm = stripAccents(trimmed);
    const matched = keywords.filter((k) => answerNorm.includes(k));
    keywordScore = Math.round((matched.length / keywords.length) * 70);
  } else {
    // Không có từ khoá để so khớp → chỉ tính theo độ dài, nới trần lên 70
    keywordScore = Math.min(40, Math.floor(trimmed.length / 15) * 4);
  }

  return Math.max(0, Math.min(100, lengthScore + keywordScore));
}

export default function InterviewPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loadError, setLoadError] = useState("");

  const [phase, setPhase] = useState<"intro" | "running" | "saving" | "finished">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_SEC);
  const [collected, setCollected] = useState<AnswerRecord[]>([]);
  const [saveError, setSaveError] = useState("");

  const answerDraftRef = useRef(answerDraft);
  answerDraftRef.current = answerDraft;

  // Trả lời bằng giọng nói — tuỳ chọn thêm bên cạnh gõ tay, không bắt buộc.
  // Dùng model ASR THẬT (PhoWhisper tiếng Việt) chạy 100% trong trình duyệt,
  // không gọi API ngoài — xem chi tiết ở useVoiceToText.ts / asr-worker.js.
  // Văn bản nhận diện được nối thêm vào ô trả lời để người dùng vẫn xem/sửa
  // lại trước khi nộp câu trả lời.
  const handleVoiceResult = useCallback((text: string) => {
    if (!text) return;
    setAnswerDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }, []);
  const {
    status: voiceStatus,
    modelProgressPct: voiceModelProgressPct,
    errorMsg: voiceErrorMsg,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    cancelRecording: cancelVoiceRecording,
  } = useVoiceToText(handleVoiceResult);

  // ── Auth + nạp dữ liệu câu hỏi thật từ kết quả phân tích gần nhất ──────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/interview");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setCandidateName(profile?.full_name ?? user.email?.split("@")[0] ?? "");

      const raw = sessionStorage.getItem("cf_result");
      const jobId = sessionStorage.getItem("cf_job_id");
      if (!raw) {
        setLoadError("Không tìm thấy kết quả phân tích gần nhất trong phiên này. Hãy phân tích CV trước, sau đó mở phiếu phỏng vấn từ trang kết quả.");
        setCheckedAuth(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const qs: ApiQuestion[] = parsed?.questions ?? [];
        if (!qs.length) {
          setLoadError("Kết quả phân tích này không có câu hỏi phỏng vấn gợi ý nào để giả lập.");
        } else {
          setQuestions(qs);
        }
        setJobTitle(parsed?.job_title || "");
        setAnalysisJobId(jobId);
      } catch {
        setLoadError("Không đọc được dữ liệu kết quả phân tích.");
      }
      setCheckedAuth(true);
    })();
  }, [router]);

  const finishInterview = useCallback(async (finalAnswers: AnswerRecord[]) => {
    setPhase("saving");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/interview");
      return;
    }

    const totalScore = finalAnswers.length
      ? Math.round(finalAnswers.reduce((sum, a) => sum + a.question_score, 0) / finalAnswers.length)
      : 0;
    const submittedCount = finalAnswers.filter((a) => a.outcome === "submitted").length;
    const timeoutCount = finalAnswers.filter((a) => a.outcome === "timeout").length;
    const skippedCount = finalAnswers.filter((a) => a.outcome === "skipped").length;
    const eliminatedNote =
      timeoutCount || skippedCount
        ? ` (${timeoutCount} câu hết giờ bị loại, ${skippedCount} câu bị bỏ qua — cả hai đều 0 điểm)`
        : "";
    const summary = `Hoàn thành phỏng vấn giả lập ${finalAnswers.length} câu (nộp đúng giờ ${submittedCount}/${finalAnswers.length})${eliminatedNote}, điểm trung bình ${totalScore}/100 — vị trí ${jobTitle || "chưa xác định"}.`;

    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        analysis_job_id: analysisJobId,
        job_title: jobTitle || null,
        candidate_name: candidateName || null,
        questions,
        answers: finalAnswers,
        status: "completed",
        total_score: totalScore,
        summary,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      setSaveError("Lưu kết quả phỏng vấn thất bại: " + (error?.message || "unknown"));
      setPhase("finished");
      return;
    }

    router.push(`/dashboard/interview/${data.id}`);
  }, [analysisJobId, candidateName, jobTitle, questions, router]);

  const goToNext = useCallback((timeUsed: number, outcome: AnswerOutcome) => {
    // Tắt mic ngay khi chuyển câu — tránh ghi âm/transcribe của câu cũ lỡ tay
    // rơi vào ô trả lời của câu kế tiếp (vd hết giờ đúng lúc đang ghi âm).
    cancelVoiceRecording();

    const q = questions[currentIndex];
    const answerText = answerDraftRef.current;

    // Hết giờ hoàn toàn hoặc bấm "Bỏ qua" → câu đó bị loại, luôn 0 điểm
    // (dù người dùng có kịp gõ gì đó, nội dung vẫn được lưu lại làm data thật
    // để xem lại, nhưng không được tính điểm).
    // Nộp trong thời gian → điểm thật từ scoreAnswer(), nhân hệ số theo mốc
    // thời gian đã dùng (phút đầu giữ nguyên, phút 2-3 giảm dần).
    const baseScore = outcome === "submitted" ? scoreAnswer(answerText, q.expected) : 0;
    const finalScore = outcome === "submitted" ? Math.round(baseScore * timeMultiplier(timeUsed)) : 0;

    const record: AnswerRecord = {
      question_id: q.id,
      category: q.category,
      question: q.question,
      expected: q.expected,
      red_flags: q.redFlags,
      time_limit_sec: TIME_PER_QUESTION_SEC,
      time_used_sec: timeUsed,
      answer_text: answerText.trim(),
      question_score: finalScore,
      outcome,
      answered_at: new Date().toISOString(),
    };

    setCollected((prev) => {
      const next = [...prev, record];
      if (currentIndex + 1 >= questions.length) {
        finishInterview(next);
      } else {
        setCurrentIndex((i) => i + 1);
        setAnswerDraft("");
        setTimeLeft(TIME_PER_QUESTION_SEC);
      }
      return next;
    });
  }, [currentIndex, questions, finishInterview, cancelVoiceRecording]);

  // ── Đếm ngược 3 phút (180s) / câu ────────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft <= 0) {
      // Hết giờ hoàn toàn — câu này bị loại (0 điểm), không phụ thuộc nội dung đã gõ
      goToNext(TIME_PER_QUESTION_SEC, "timeout");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, goToNext]);

  function handleStart() {
    setCurrentIndex(0);
    setAnswerDraft("");
    setTimeLeft(TIME_PER_QUESTION_SEC);
    setCollected([]);
    setPhase("running");
  }

  function handleSubmitAnswer() {
    goToNext(TIME_PER_QUESTION_SEC - timeLeft, "submitted");
  }

  function handleSkip() {
    // Bỏ qua chủ động — khác với hết giờ, nhưng cũng mất điểm câu này (0đ)
    goToNext(TIME_PER_QUESTION_SEC - timeLeft, "skipped");
  }

  if (!checkedAuth) {
    return (
      <div className="bg-[#f8f9ff] min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 flex flex-col">
        <section className="w-full max-w-3xl mx-auto px-4 lg:px-8 py-10 flex-1">
          {loadError ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[40px] mb-3">error</span>
              <p className="text-[#0b1c30] font-semibold mb-2">Không thể bắt đầu phỏng vấn</p>
              <p className="text-[13px] text-[#565e74] mb-6">{loadError}</p>
              <Link href="/score" className="px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors">
                Quay lại trang phân tích
              </Link>
            </div>
          ) : phase === "intro" ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0037b0]/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[#0037b0] text-[32px]">quiz</span>
              </div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-bold text-[#0b1c30] mb-2">
                Giả lập phỏng vấn — {jobTitle || "vị trí ứng tuyển"}
              </h1>
              <div className="text-[13px] text-[#565e74] mb-6 text-left bg-[#eff4ff] rounded-xl p-4 space-y-2">
                <p>
                  <strong className="text-[#0b1c30]">{questions.length} câu hỏi</strong> được tạo dựa trên khoảng
                  trống năng lực thật của {candidateName || "bạn"}
                  {questions.length !== TOTAL_QUESTIONS ? " (kết quả phân tích này chưa đủ 5 câu — hãy phân tích CV lại để có bộ câu hỏi mới nhất)." : "."}
                  {" "}Mỗi câu có <strong className="text-[#0b1c30]">3 phút (180 giây)</strong> để trả lời.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Trả lời trong <strong>phút đầu</strong>: điểm được tính đầy đủ.</li>
                  <li>Trả lời ở <strong>phút 2–3</strong>: điểm giảm dần theo thời gian đã dùng.</li>
                  <li><strong>Hết giờ</strong> mà chưa nộp: câu đó bị loại, 0 điểm.</li>
                  <li>Bấm <strong>“Bỏ qua”</strong>: cũng bị mất điểm câu đó (0 điểm), khác với hết giờ.</li>
                  <li>Có thể <strong>gõ tay</strong> hoặc bấm <strong>micro để trả lời bằng giọng nói</strong> (tự động chuyển thành văn bản) — tuỳ bạn chọn, có thể kết hợp cả hai.</li>
                </ul>
                <p>Kết quả (từng câu, điểm, thời gian dùng) sẽ được lưu lại vào hồ sơ để bạn xem lại sau.</p>
              </div>
              <button
                onClick={handleStart}
                className="px-6 py-3 rounded-xl bg-[#1d4ed8] text-white text-[15px] font-semibold hover:bg-[#0037b0] transition-colors flex items-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                Bắt đầu phỏng vấn
              </button>
            </div>
          ) : phase === "running" ? (
            <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-[#565e74] uppercase tracking-wider">
                  Câu {currentIndex + 1}/{questions.length} — {questions[currentIndex]?.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-[13px] font-bold ${
                    timeLeft <= 10 ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#e5eeff] text-[#0037b0]"
                  }`}
                >
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden mb-6">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? "bg-[#ba1a1a]" : "bg-[#1d4ed8]"}`}
                  style={{ width: `${(timeLeft / TIME_PER_QUESTION_SEC) * 100}%` }}
                />
              </div>

              <p className="font-[family-name:var(--font-plus-jakarta)] text-[17px] font-semibold text-[#0b1c30] leading-relaxed mb-4">
                {questions[currentIndex]?.question}
              </p>

              <textarea
                autoFocus
                className="w-full bg-[#eff4ff] rounded-xl p-4 text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:bg-[#e5eeff] transition-all resize-none"
                rows={8}
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây, hoặc bấm micro để trả lời bằng giọng nói..."
              />

              {/* Trả lời bằng giọng nói — tuỳ chọn, có thể dùng thay hoặc kết hợp với gõ tay */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={voiceStatus === "recording" ? stopVoiceRecording : startVoiceRecording}
                  disabled={voiceStatus === "transcribing"}
                  className={`px-4 py-2 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0 ${
                    voiceStatus === "recording"
                      ? "bg-[#ba1a1a] text-white hover:bg-[#93000a]"
                      : voiceStatus === "transcribing"
                      ? "bg-[#e5eeff] text-[#9aa0b4] cursor-not-allowed"
                      : "bg-white border border-[#c4c5d7]/60 text-[#0037b0] hover:bg-[#eff4ff]"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${voiceStatus === "recording" ? "animate-pulse" : ""}`}>
                    {voiceStatus === "recording" ? "stop_circle" : "mic"}
                  </span>
                  {voiceStatus === "recording" ? "Dừng ghi âm" : "Trả lời bằng giọng nói"}
                </button>
                <span className="text-[12px] text-[#8fa5c0]">
                  {voiceStatus === "recording" && "Đang ghi âm — bấm “Dừng ghi âm” khi trả lời xong."}
                  {voiceStatus === "transcribing" &&
                    (voiceModelProgressPct !== null && voiceModelProgressPct > 0 && voiceModelProgressPct < 100
                      ? `Đang tải mô hình nhận diện giọng nói tiếng Việt (chỉ lần đầu)... ${voiceModelProgressPct}%`
                      : "Đang chuyển giọng nói thành văn bản...")}
                  {voiceStatus === "error" && <span className="text-[#ba1a1a]">{voiceErrorMsg}</span>}
                  {voiceStatus === "idle" &&
                    "Có thể ghi âm nhiều lần, văn bản sẽ được nối vào ô trả lời để bạn xem/sửa lại trước khi nộp."}
                </span>
              </div>

              <p className="mt-3 text-[11px] text-[#8fa5c0]">
                {timeLeft > TIME_PER_QUESTION_SEC - FULL_SCORE_WINDOW_SEC
                  ? "Đang trong phút đầu — trả lời giờ để được tính điểm đầy đủ."
                  : "Đã qua phút đầu — điểm sẽ giảm dần theo thời gian đã dùng."}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[#8fa5c0]">{answerDraft.trim().length} ký tự</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkip}
                    disabled={voiceStatus === "recording" || voiceStatus === "transcribing"}
                    className={`px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                      voiceStatus === "recording" || voiceStatus === "transcribing"
                        ? "bg-[#f0f0f0] text-[#c4c5d7] cursor-not-allowed"
                        : "bg-white border border-[#c4c5d7]/60 text-[#565e74] hover:bg-[#f0f4ff]"
                    }`}
                    title="Bỏ qua câu này — sẽ bị 0 điểm"
                  >
                    <span className="material-symbols-outlined text-[16px]">skip_next</span>
                    Bỏ qua
                  </button>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={voiceStatus === "recording" || voiceStatus === "transcribing"}
                    className={`px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                      voiceStatus === "recording" || voiceStatus === "transcribing"
                        ? "bg-[#e5eeff] text-[#9aa0b4] cursor-not-allowed"
                        : "bg-[#1d4ed8] text-white hover:bg-[#0037b0]"
                    }`}
                    title={
                      voiceStatus === "recording"
                        ? "Hãy dừng ghi âm trước khi nộp câu trả lời"
                        : undefined
                    }
                  >
                    {currentIndex + 1 >= questions.length ? "Nộp & xem kết quả" : "Nộp & câu tiếp theo"}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ) : phase === "saving" ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[32px] mb-3">progress_activity</span>
              <p className="text-[#0b1c30] font-medium">Đang lưu kết quả phỏng vấn...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[40px] mb-3">error</span>
              <p className="text-[#0b1c30] font-semibold mb-2">Có lỗi khi lưu kết quả</p>
              <p className="text-[13px] text-[#565e74] mb-6">{saveError}</p>
              <button
                onClick={() => finishInterview(collected)}
                className="px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors"
              >
                Thử lưu lại
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
