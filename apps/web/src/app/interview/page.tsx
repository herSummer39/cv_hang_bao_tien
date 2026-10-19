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

// 7 giọng đọc VieNeu-TTS — ĐÚNG mã + tên hiển thị đã dùng ở tool video
// (html-render-video-v2-react/ui/index.html), để nhất quán. "" = không
// đọc giọng (chỉ hiện chữ như trước đây), phòng khi máy chưa cài vieneu.
const VOICE_OPTIONS: { code: string; label: string }[] = [
  { code: "Ly", label: "Trúc Ly — nữ, miền Bắc (mặc định)" },
  { code: "Ngoc", label: "Bích Ngọc — nữ, miền Bắc" },
  { code: "Doan", label: "Thục Đoan — nữ, miền Nam" },
  { code: "Binh", label: "Thanh Bình — nam, miền Bắc" },
  { code: "Tuyen", label: "Phạm Tuyên — nam, miền Bắc" },
  { code: "Vinh", label: "Xuân Vĩnh — nam, miền Nam" },
  { code: "Son", label: "Thái Sơn — nam, miền Nam" },
  { code: "", label: "Không đọc giọng (chỉ hiện chữ)" },
];

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

// Bộ câu hỏi phỏng vấn mẫu chất lượng cao cho chế độ Luyện tập Tự do (Demo Mode)
const PRESET_INTERVIEWS: Record<string, { title: string; questions: ApiQuestion[] }> = {
  frontend: {
    title: "Kỹ sư Frontend (React / TypeScript)",
    questions: [
      {
        id: "p_fe_1",
        category: "Chuyên môn kỹ thuật",
        duration: "3 phút",
        weight: "Cao",
        question: "Khi ứng dụng React bị giật lag do re-render quá nhiều component con, bạn sẽ dùng công cụ nào để chẩn đoán và những kỹ thuật nào để tối ưu hiệu năng?",
        expected: ["React DevTools Profiler", "useMemo", "useCallback", "React.memo", "tách state xuống component con", "virtualize danh sách lớn"],
        redFlags: ["Lạm dụng useMemo bừa bãi", "Không biết dùng Profiler"],
      },
      {
        id: "p_fe_2",
        category: "Kiến trúc & Tối ưu",
        duration: "3 phút",
        weight: "Trung bình",
        question: "Hãy giải thích cách bạn tối ưu chỉ số Core Web Vitals (LCP, INP, CLS) cho một trang web thương mại điện tử hoặc tin tức?",
        expected: ["Lazy loading hình ảnh", "Tối ưu web font", "Code-splitting qua dynamic import", "Giữ kích thước layout cố định tránh CLS", "CDN và caching"],
        redFlags: ["Không phân biệt được LCP và CLS", "Chỉ trả lời chung chung"],
      },
      {
        id: "p_fe_3",
        category: "Xử lý tình huống",
        duration: "3 phút",
        weight: "Cao",
        question: "Khi sản phẩm sắp đến hạn phát hành nhưng phát sinh xung đột giữa nợ kỹ thuật (technical debt) và tính năng mới từ Product Manager, bạn sẽ trao đổi và xử lý thế nào?",
        expected: ["Trao đổi thẳng thắn với PM", "Phân loại mức độ rủi ro", "Đề xuất MVP khả thi", "Lên kế hoạch refactor sau release"],
        redFlags: ["Tự ý cắt bớt test không báo", "Bất hợp tác thiếu chuyên nghiệp"],
      },
    ],
  },
  pm: {
    title: "Trưởng nhóm Sản phẩm (Product Lead)",
    questions: [
      {
        id: "p_pm_1",
        category: "Tư duy sản phẩm",
        duration: "3 phút",
        weight: "Cao",
        question: "Làm thế nào bạn quyết định ưu tiên một tính năng mà khách hàng doanh nghiệp lớn đòi hỏi, nhưng tính năng đó lại không nằm trong lộ trình (Roadmap) ban đầu của sản phẩm?",
        expected: ["Đánh giá tác động doanh thu vs chi phí cơ hội", "Khảo sát tính đại diện cho thị trường", "Khung RICE hoặc MoSCoW", "Đàm phán giải pháp thay thế linh hoạt"],
        redFlags: ["Ngay lập tức làm theo mà không tính toán", "Từ chối thẳng thừng làm mất khách"],
      },
      {
        id: "p_pm_2",
        category: "Phân tích dữ liệu",
        duration: "3 phút",
        weight: "Cao",
        question: "Nếu sau khi ra mắt phiên bản mới, chỉ số Retention (tỷ lệ giữ chân người dùng) giảm 15%, các bước cụ thể bạn sẽ thực hiện để tìm nguyên nhân và khắc phục là gì?",
        expected: ["Phân tích Funnel và Cohort", "Kiểm tra bug kỹ thuật và hiệu năng", "Khảo sát ý kiến người dùng rời bỏ (churn survey)", "A/B test thử nghiệm sửa đổi"],
        redFlags: ["Đổ lỗi cho đội Dev", "Đoán mò không dựa vào số liệu"],
      },
    ],
  },
  sales: {
    title: "Chuyên viên Kinh doanh B2B (Sales Specialist)",
    questions: [
      {
        id: "p_sales_1",
        category: "Kỹ năng đàm phán",
        duration: "3 phút",
        weight: "Cao",
        question: "Khi khách hàng tiềm năng nhận xét: 'Giải pháp phần mềm của bạn rất hay nhưng giá cao hơn 30% so với đối thủ', bạn sẽ phản hồi và dẫn dắt cuộc đàm phán như thế nào?",
        expected: ["Tập trung vào ROI và giá trị mang lại", "Làm rõ điểm khác biệt về chất lượng và dịch vụ", "Tùy biến gói triển khai linh hoạt", "Lắng nghe ngân sách thực tế"],
        redFlags: ["Ngay lập tức giảm giá sâu", "Chê bai đối thủ thiếu chuyên nghiệp"],
      },
      {
        id: "p_sales_2",
        category: "Quản trị phễu",
        duration: "3 phút",
        weight: "Trung bình",
        question: "Quy trình qualify (xác thực) một khách hàng tiềm năng qua mô hình BANT (Budget, Authority, Need, Timeline) của bạn diễn ra như thế nào?",
        expected: ["Xác định đúng người có quyền quyết định", "Đánh giá mức độ cấp bách của nỗi đau", "Kiểm tra ngân sách dự toán", "Lộ trình triển khai cụ thể"],
        redFlags: ["Theo đuổi lead ảo tốn tài nguyên", "Không hỏi về ngân sách"],
      },
    ],
  },
};

export default function InterviewPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [isPresetMode, setIsPresetMode] = useState(false);
  const [activePresetKey, setActivePresetKey] = useState<"frontend" | "pm" | "sales">("frontend");
  const [loadError, setLoadError] = useState("");

  const [phase, setPhase] = useState<"intro" | "preparing" | "running" | "saving" | "finished">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_SEC);
  const [collected, setCollected] = useState<AnswerRecord[]>([]);
  const [saveError, setSaveError] = useState("");
  const [guestResult, setGuestResult] = useState<{ totalScore: number; answers: AnswerRecord[] } | null>(null);

  // Đọc câu hỏi bằng giọng người phỏng vấn — VieNeu-TTS (7 giọng vùng miền),
  // sinh audio local qua worker.py lúc bấm "Bắt đầu", KHÔNG gọi API ngoài.
  const [selectedVoice, setSelectedVoice] = useState("Ly");
  const [audioUrls, setAudioUrls] = useState<string[] | null>(null);
  const [audioNote, setAudioNote] = useState("");
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioJobId, setAudioJobId] = useState<string | null>(null);
  const [audioJobActive, setAudioJobActive] = useState(false);
  const playedAudioRef = useRef<Set<number>>(new Set());

  const answerDraftRef = useRef(answerDraft);
  answerDraftRef.current = answerDraft;

  // Trả lời bằng giọng nói — tuỳ chọn thêm bên cạnh gõ tay, không bắt buộc.
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

  // ── Auth + nạp dữ liệu câu hỏi (Từ kết quả phân tích CV hoặc Bộ câu hỏi mẫu) ──
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setCandidateName(profile?.full_name ?? user.email?.split("@")[0] ?? "");
      } else {
        setCandidateName("Bạn");
      }

      const raw = sessionStorage.getItem("cf_result");
      const jobId = sessionStorage.getItem("cf_job_id");

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const qs: ApiQuestion[] = parsed?.questions ?? [];
          if (qs.length > 0) {
            setQuestions(qs);
            setJobTitle(parsed?.job_title || "Vị trí ứng tuyển theo CV");
            setAnalysisJobId(jobId);
            setIsPresetMode(false);
            setCheckedAuth(true);
            return;
          }
        } catch {
          // Bỏ qua lỗi parse, chuyển sang chế độ Preset mẫu
        }
      }

      // Nếu chưa có kết quả phân tích CV: chuyển sang Chế độ Luyện tập Tự do (Preset)
      setIsPresetMode(true);
      const defaultPreset = PRESET_INTERVIEWS.frontend;
      setQuestions(defaultPreset.questions);
      setJobTitle(defaultPreset.title);
      setCheckedAuth(true);
    })();
  }, []);

  function selectPreset(key: "frontend" | "pm" | "sales") {
    setActivePresetKey(key);
    const p = PRESET_INTERVIEWS[key];
    setQuestions(p.questions);
    setJobTitle(p.title);
  }

  const finishInterview = useCallback(async (finalAnswers: AnswerRecord[]) => {
    const totalScore = finalAnswers.length
      ? Math.round(finalAnswers.reduce((sum, a) => sum + a.question_score, 0) / finalAnswers.length)
      : 0;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Nếu chưa đăng nhập: Hiển thị kết quả ngay tại chỗ, không bắt buộc redirect sang /login
    if (!user) {
      setGuestResult({ totalScore, answers: finalAnswers });
      setPhase("finished");
      return;
    }

    setPhase("saving");
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
      // Vẫn cho xem kết quả tại chỗ nếu lỗi ghi db
      setGuestResult({ totalScore, answers: finalAnswers });
      setSaveError("Không thể lưu trực tuyến: " + (error?.message || "unknown") + " — kết quả hiển thị bên dưới:");
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

  // Đọc câu hỏi bằng giọng người phỏng vấn (VieNeu-TTS trên worker.py local).
  // worker sinh TỪNG CÂU MỘT và cập nhật audio_urls ngay → chỉ cần chờ câu 1
  // rồi vào phỏng vấn, các câu sau tiếp tục được sinh trong nền (poll ở
  // useEffect bên dưới). Lỗi/quá lâu không bao giờ chặn phỏng vấn.
  async function handleStart() {
    setCurrentIndex(0);
    setAnswerDraft("");
    setTimeLeft(TIME_PER_QUESTION_SEC);
    setCollected([]);
    setAudioUrls(null);
    setAudioNote("");
    setAudioJobId(null);
    setAudioJobActive(false);
    playedAudioRef.current = new Set();

    if (!selectedVoice || questions.length === 0) {
      setPhase("running");
      return;
    }

    setPhase("preparing");
    try {
      const supabase = createClient();
      const { data: job, error: insertError } = await supabase
        .from("interview_audio_jobs")
        .insert({
          analysis_job_id: analysisJobId,
          voice: selectedVoice,
          questions: questions.map((q) => q.question),
        })
        .select("id")
        .single();
      if (insertError || !job?.id) throw new Error(insertError?.message || "tạo audio job thất bại");

      setAudioJobId(job.id);
      setAudioJobActive(true);

      // Chỉ chờ audio CÂU 1 (tối đa 60s). Các câu sau poll tiếp trong nền.
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const { data: row } = await supabase
          .from("interview_audio_jobs")
          .select("status, audio_urls")
          .eq("id", job.id)
          .single();
        const urls = (row?.audio_urls as string[] | null) || null;
        if (urls && urls.length > 0) {
          setAudioUrls(urls);
          if (row?.status === "done") setAudioJobActive(false);
          break;
        }
        if (row?.status === "error") {
          setAudioJobActive(false);
          setAudioNote("Không tạo được giọng đọc (worker báo lỗi) — vẫn tiếp tục phỏng vấn, chỉ hiện chữ.");
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      setAudioJobActive(false);
      setAudioNote(
        "Không tạo được giọng đọc: " + (e instanceof Error ? e.message : "unknown") + " — vẫn tiếp tục phỏng vấn, chỉ hiện chữ."
      );
    } finally {
      setPhase("running");
    }
  }

  // Poll nền: lấy audio các câu tiếp theo khi worker sinh xong từng câu.
  useEffect(() => {
    if (!audioJobId || !audioJobActive) return;
    if (phase !== "running" && phase !== "preparing") return;
    const supabase = createClient();
    let stopped = false;
    const timer = setInterval(async () => {
      const { data: row } = await supabase
        .from("interview_audio_jobs")
        .select("status, audio_urls")
        .eq("id", audioJobId)
        .single();
      if (stopped || !row) return;
      const urls = (row.audio_urls as string[] | null) || null;
      if (urls && urls.length > 0) setAudioUrls(urls);
      if (row.status === "done" || row.status === "error") setAudioJobActive(false);
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [audioJobId, audioJobActive, phase]);

  // Tự phát audio câu hiện tại đúng 1 lần (khi vào câu, hoặc khi audio của câu
  // đó vừa sinh xong). Trình duyệt chặn autoplay thì có nút "Nghe lại câu hỏi".
  useEffect(() => {
    if (phase !== "running") return;
    const url = audioUrls?.[currentIndex];
    const el = questionAudioRef.current;
    if (!url || !el || playedAudioRef.current.has(currentIndex)) return;
    playedAudioRef.current.add(currentIndex);
    el.src = url;
    el.play().catch(() => {
      // Tự phát bị chặn — người dùng bấm nút "Nghe lại câu hỏi".
    });
  }, [phase, currentIndex, audioUrls]);

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
          {phase === "intro" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8">
              {/* Header Intro */}
              <div className="text-center max-w-xl mx-auto mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">record_voice_over</span>
                </div>
                <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] sm:text-[26px] font-bold text-[#0b1c30]">
                  Phòng luyện phỏng vấn AI
                </h1>
                <p className="text-[13px] sm:text-[14px] text-[#64748b] mt-1.5 leading-relaxed">
                  {isPresetMode
                    ? "Luyện phản xạ phỏng vấn với các câu hỏi tình huống thực tế. Hỗ trợ trả lời bằng giọng nói và chấm điểm tự động."
                    : `Câu hỏi được AI đối soát và cá nhân hóa theo khoảng trống năng lực trong CV của bạn cho vị trí ${jobTitle}.`}
                </p>
              </div>

              {/* Banner Chế độ Preset nếu chưa phân tích CV */}
              {isPresetMode && (
                <div className="mb-6 p-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#0037b0]">tips_and_updates</span>
                      <span className="text-[13px] font-bold text-[#1e40af]">
                        Chọn vị trí mẫu để bắt đầu luyện tập:
                      </span>
                    </div>
                    <Link
                      href="/score"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0037b0] hover:underline"
                    >
                      <span>Hoặc tải CV để tạo câu hỏi riêng</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>

                  {/* Preset Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        { key: "frontend", label: "Frontend Engineer", icon: "terminal" },
                        { key: "pm", label: "Product Lead", icon: "view_kanban" },
                        { key: "sales", label: "Sales B2B", icon: "trending_up" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectPreset(item.key)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          activePresetKey === item.key
                            ? "bg-white border-[#0037b0] text-[#0037b0] shadow-sm ring-2 ring-[#0037b0]/20 font-bold"
                            : "bg-white/60 border-[#dce1ff] text-[#475569] hover:bg-white font-medium"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        <span className="text-[12px] truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông tin bài thi & Quy chế */}
              <div className="text-[13px] text-[#475569] mb-6 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <span className="font-semibold text-[#0b1c30]">
                    Vị trí: <span className="text-[#0037b0]">{jobTitle}</span>
                  </span>
                  <span className="text-[12px] bg-[#e2e8f0] px-2 py-0.5 rounded-md font-medium text-[#475569]">
                    {questions.length} câu hỏi
                  </span>
                </div>
                <ul className="space-y-1.5 text-[12px] leading-relaxed pt-1">
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#059669] shrink-0 mt-0.5">timer</span>
                    <span>Mỗi câu có tối đa <strong>3 phút (180s)</strong>. Nộp trong phút đầu để đạt điểm tối ưu.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#0037b0] shrink-0 mt-0.5">mic</span>
                    <span>Bạn có thể <strong>gõ chữ</strong> hoặc bấm micro để <strong>trả lời bằng giọng nói tiếng Việt</strong>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#0284c7] shrink-0 mt-0.5">volume_up</span>
                    <span>Phỏng vấn viên sẽ tự động đọc câu hỏi bằng giọng nói tự nhiên (VieNeu-TTS).</span>
                  </li>
                </ul>
              </div>

              {/* Cài đặt Giọng đọc */}
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                  Giọng đọc phỏng vấn viên (VieNeu-TTS)
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] focus:bg-white transition-all"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.code || "none"} value={v.code}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleStart}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0037b0] via-[#1a56db] to-[#2563eb] text-white text-[15px] font-bold hover:shadow-lg hover:shadow-[#0037b0]/25 transition-all flex items-center justify-center gap-2 mx-auto active:scale-[0.99] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  Bắt đầu phỏng vấn ngay
                </button>
              </div>
            </div>
          ) : phase === "preparing" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8 text-center max-w-md mx-auto">
              <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[36px] mb-3 block">progress_activity</span>
              <p className="text-[#0b1c30] font-bold text-[16px] mb-1">Đang chuẩn bị giọng đọc phỏng vấn viên...</p>
              <p className="text-[12px] text-[#64748b] leading-relaxed">
                Đang nạp giọng đọc cho câu hỏi đầu tiên. Quá trình phỏng vấn sẽ bắt đầu sau giây lát.
              </p>
            </div>
          ) : phase === "running" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8">
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

              {audioUrls?.[currentIndex] && (
                <div className="mb-4 flex items-center gap-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio ref={questionAudioRef} className="hidden" />
                  <button
                    type="button"
                    onClick={() => questionAudioRef.current?.play().catch(() => {})}
                    className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0037b0] text-[12px] font-medium flex items-center gap-1.5 hover:bg-[#e5eeff] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">volume_up</span>
                    Nghe lại câu hỏi
                  </button>
                </div>
              )}
              {!audioUrls?.[currentIndex] && audioJobActive && (
                <p className="text-[12px] text-[#9aa0b4] mb-3">Đang tạo giọng đọc cho câu này, sẽ tự phát khi xong...</p>
              )}
              {audioNote && (
                <p className="text-[12px] text-[#9aa0b4] mb-3">{audioNote}</p>
              )}

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
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8 text-center max-w-md mx-auto">
              <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[36px] mb-3 block">progress_activity</span>
              <p className="text-[#0b1c30] font-bold text-[16px]">Đang phân tích và tổng kết kết quả...</p>
            </div>
          ) : (
            /* Phase: Finished - Bảng tổng kết kết quả phỏng vấn */
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center mx-auto mb-3 ring-4 ring-[#ecfdf5]">
                  <span className="material-symbols-outlined text-[32px]">military_tech</span>
                </div>
                <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[22px] font-bold text-[#0b1c30]">
                  Kết quả phỏng vấn thử nghiệm
                </h2>
                <p className="text-[13px] text-[#64748b] mt-1">
                  Vị trí: <strong className="text-[#0b1c30]">{jobTitle}</strong>
                </p>
              </div>

              {/* Thẻ điểm tổng */}
              {guestResult && (
                <div className="mb-6 p-5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-[22px] ${
                      guestResult.totalScore >= 70
                        ? "bg-[#ecfdf5] text-[#059669]"
                        : guestResult.totalScore >= 50
                        ? "bg-[#fffbeb] text-[#d97706]"
                        : "bg-[#fef2f2] text-[#dc2626]"
                    }`}>
                      {guestResult.totalScore}
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px] text-[#0b1c30]">
                        Điểm đánh giá trung bình
                      </h4>
                      <p className="text-[12px] text-[#64748b]">
                        Đã trả lời {guestResult.answers.length} câu hỏi theo thang điểm chuẩn năng lực.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/login?next=/interview"
                    className="px-4 py-2.5 rounded-xl bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[13px] font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Đăng nhập để lưu vào hồ sơ
                  </Link>
                </div>
              )}

              {/* Chi tiết từng câu */}
              {guestResult && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-bold text-[14px] text-[#0b1c30] mb-2">Chi tiết từng câu hỏi:</h4>
                  {guestResult.answers.map((ans, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#e2e8f0] bg-white text-[13px]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-semibold text-[#0b1c30]">
                          Câu {idx + 1}: {ans.question}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                          ans.question_score >= 70
                            ? "bg-[#ecfdf5] text-[#059669]"
                            : ans.question_score >= 50
                            ? "bg-[#fffbeb] text-[#d97706]"
                            : "bg-[#fef2f2] text-[#dc2626]"
                        }`}>
                          {ans.question_score}/100 đ
                        </span>
                      </div>
                      <p className="text-[12px] text-[#64748b] bg-[#f8fafc] p-2.5 rounded-lg border border-[#f1f5f9]">
                        <strong>Trả lời:</strong> {ans.answer_text || "(Không có nội dung trả lời / đã bỏ qua)"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("intro");
                    setGuestResult(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc] text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">replay</span>
                  Luyện tập vị trí khác
                </button>
                <Link
                  href="/score"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-bold hover:bg-[#1d4ed8] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Tải CV lên phân tích chuyên sâu
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
