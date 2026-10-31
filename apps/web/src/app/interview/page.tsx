"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { normalizeTranscriptWithContext, type QuestionContext } from "@/utils/dynamicSpeechNormalizer";

const TIME_PER_QUESTION_SEC = 180; // 3 phút / câu
const FULL_SCORE_WINDOW_SEC = 60; // phút đầu — điểm tính đầy đủ, không giảm
const MIN_TIME_MULTIPLIER = 0.5; // sàn giảm điểm ở cuối phút thứ 3 (giây 180)

// Giọng đọc mặc định cố định: Giọng nữ Hà Nội chuẩn (Trúc Ly — VieNeu-TTS / Web Speech)
const DEFAULT_VOICE_LABEL = "Nữ chuẩn Việt Nam";
const DEFAULT_VOICE_CODE = "Ly";


type ApiQuestion = {
  id: string;
  category: string;
  duration: string;
  weight: string;
  question: string;
  expected: string[];
  redFlags: string[];
  // Metadata tuỳ chọn từ ngân hàng câu hỏi (interview_questions) — dùng cho
  // chuẩn hóa thuật ngữ phiên âm và chấm điểm theo rubric.
  skill?: string;
  skill_tag?: string;
  sample_answer?: string;
};

// Lấy tên kỹ năng khớp/thiếu từ kết quả phân tích CV↔JD (chuỗi hoặc {name}).
function extractSkillNames(parsed: unknown): string[] {
  const p = parsed as { matched_skills?: unknown; missing_skills?: unknown } | null;
  const toNames = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .map((x) =>
            typeof x === "string"
              ? x
              : typeof x === "object" && x !== null && typeof (x as { name?: unknown }).name === "string"
              ? (x as { name: string }).name
              : ""
          )
          .filter(Boolean)
      : [];
  return [...toNames(p?.matched_skills), ...toNames(p?.missing_skills)];
}

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
  feedback?: string;
  corrected_text?: string;
};

// Hệ số giảm điểm theo thời gian dùng thật của câu trả lời:
// 0–60s (phút đầu): hệ số 1 — điểm tính đầy đủ.
// 60–180s (phút 2–3): giảm dần tuyến tính từ 1 xuống MIN_TIME_MULTIPLIER.
function timeMultiplier(timeUsedSec: number): number {
  if (timeUsedSec <= FULL_SCORE_WINDOW_SEC) return 1;
  if (timeUsedSec >= TIME_PER_QUESTION_SEC) return MIN_TIME_MULTIPLIER;
  const t = (timeUsedSec - FULL_SCORE_WINDOW_SEC) / (TIME_PER_QUESTION_SEC - FULL_SCORE_WINDOW_SEC);
  return 1 - t * (1 - MIN_TIME_MULTIPLIER);
}

// Bỏ dấu tiếng Việt để so khớp từ khoá được rộng rãi hơn
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

// Trích các từ khoá "có nghĩa" từ danh sách tiêu chí kỳ vọng
function extractKeywords(text: string): string[] {
  const normalized = stripAccents(text);
  const words = normalized.match(/[a-z0-9+#./-]{4,}/g) || [];
  return Array.from(new Set(words.filter((w) => !STOPWORDS.has(w))));
}

// Chấm điểm câu trả lời dự phòng bằng Heuristic matching khi không có LLM
function scoreAnswer(answerText: string, expected: string[]): number {
  const trimmed = answerText.trim();
  if (trimmed.length === 0) return 0;

  const lengthScore = Math.min(30, Math.floor(trimmed.length / 10) * 3);
  const keywords = extractKeywords(expected.join(" "));
  let keywordScore = 0;
  if (keywords.length > 0) {
    const answerNorm = stripAccents(trimmed);
    const matched = keywords.filter((k) => answerNorm.includes(k));
    keywordScore = Math.round((matched.length / keywords.length) * 70);
  } else {
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
  const [phase, setPhase] = useState<"intro" | "preparing" | "running" | "saving" | "finished">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_SEC);
  const [collected, setCollected] = useState<AnswerRecord[]>([]);
  const [saveError, setSaveError] = useState("");
  const [guestResult, setGuestResult] = useState<{ totalScore: number; answers: AnswerRecord[] } | null>(null);

  // Cố định giọng phỏng vấn viên: Giọng nữ Hà Nội chuẩn (VieNeu-TTS / Web Speech)
  const selectedVoice = DEFAULT_VOICE_CODE;
  const [audioUrls, setAudioUrls] = useState<string[] | null>(null);
  const [audioNote, setAudioNote] = useState("");
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioJobId, setAudioJobId] = useState<string | null>(null);
  const [audioJobActive, setAudioJobActive] = useState(false);
  const playedAudioRef = useRef<Set<number>>(new Set());

  // Trạng thái phát âm của VietTTS / Web Speech và trạng thái đánh giá LLM
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [jdSkills, setJdSkills] = useState<string[]>([]);

  // Khởi tạo và nạp sẵn danh sách voices cho trình duyệt
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Web Speech API Hook — nhận diện giọng nói native với latency 0ms
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Dừng mọi âm thanh câu hỏi đang phát
  const stopAllAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (questionAudioRef.current) {
      try {
        questionAudioRef.current.pause();
        questionAudioRef.current.currentTime = 0;
      } catch {}
    }
    setIsSpeaking(false);
  }, []);

  // Hàm đọc to câu hỏi bằng tiếng Việt — Giọng Nữ Hà Nội chuẩn:
  // Ưu tiên audio URL từ VieNeu-TTS nếu có, tự động fallback sang Web Speech Synthesis tiếng Việt chuẩn
  const playQuestionAudio = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    const qText = questions[index]?.question;
    if (!qText) return;

    // Ngắt micro tạm thời để không bị vang tiếng AI vào ô trả lời
    stopListening();
    stopAllAudio();
    setIsSpeaking(true);

    const url = audioUrls?.[index] || `/api/interview/tts?text=${encodeURIComponent(qText)}`;
    const el = questionAudioRef.current;

    // 1. Ưu tiên phát bằng audio element qua /api/interview/tts hoặc VieNeu-TTS (Giọng nữ chuẩn 100%)
    if (el) {
      el.src = url;
      el.play()
        .then(() => {
          setIsSpeaking(true);
        })
        .catch((err) => {
          console.warn("[TTS] Không phát được qua thẻ audio, chuyển sang Web Speech tiếng Việt:", err);
          speakViaSpeechSynthesis(qText);
        });
      return;
    }

    // 2. Fallback sang Web Speech API nếu không có phần tử audio
    speakViaSpeechSynthesis(qText);

    function speakViaSpeechSynthesis(text: string) {
      if (!("speechSynthesis" in window)) {
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.94;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      // Ưu tiên tìm giọng nữ tiếng Việt thực tế trong trình duyệt
      const vietnameseVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes("vi") &&
            (v.name.toLowerCase().includes("hoaimy") ||
              v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("mai") ||
              v.name.toLowerCase().includes("linh") ||
              v.name.toLowerCase().includes("natural") ||
              v.name.toLowerCase().includes("tiếng việt"))
        ) || voices.find((v) => v.lang.toLowerCase().startsWith("vi"));

      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
      } else {
        // Tuyệt đối KHÔNG gán mặc định giọng tiếng Anh (Microsoft David) để tránh nói giọng người nước ngoài
        console.warn("[TTS] Trình duyệt không có sẵn giọng tiếng Việt Web Speech.");
        setIsSpeaking(false);
        return;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        stopListening();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [questions, audioUrls, stopListening, stopAllAudio]);

  const prevTranscriptRef = useRef("");
  const answerDraftRef = useRef(answerDraft);

  useEffect(() => {
    answerDraftRef.current = answerDraft;
  }, [answerDraft]);

  // Ngữ cảnh câu hỏi đang trả lời — nguồn từ vựng đích cho bộ chuẩn hóa động
  // (đúng cho cả 17 ngành vì lấy từ metadata của chính câu hỏi).
  const questionContext = useMemo<QuestionContext>(() => {
    const q = questions[currentIndex];
    return {
      question: q?.question,
      skill_tag: q?.skill ?? q?.skill_tag,
      expected: q?.expected,
      sample_answer: q?.sample_answer,
      red_flags: q?.redFlags,
      jd_skills: jdSkills,
    };
  }, [questions, currentIndex, jdSkills]);
  const questionContextRef = useRef<QuestionContext>(questionContext);
  useEffect(() => {
    questionContextRef.current = questionContext;
  }, [questionContext]);

  // Chữ đang nói (interim) cũng được chuẩn hóa để ứng viên thấy đúng thuật ngữ ngay lập tức
  const normalizedInterim = useMemo(
    () => normalizeTranscriptWithContext(interimTranscript, questionContext),
    [interimTranscript, questionContext]
  );

  // Tự động nối kết quả nhận diện hoàn chỉnh vào answerDraft — đã chuẩn hóa thuật ngữ phiên âm
  useEffect(() => {
    if (!transcript) return;
    const added = transcript.slice(prevTranscriptRef.current.length);
    if (added) {
      const normalized = normalizeTranscriptWithContext(added.trim(), questionContextRef.current);
      setAnswerDraft((prev) => (prev ? `${prev.trim()} ${normalized}` : normalized));
      prevTranscriptRef.current = transcript;
    }
  }, [transcript]);

  // Echo Prevention Lock: khi phát câu hỏi ra loa, tắt micro để không thu lại giọng AI
  const handleQuestionAudioPlay = () => {
    setIsSpeaking(true);
    if (isListening) stopListening();
  };
  const handleQuestionAudioStop = () => setIsSpeaking(false);

  // Auth + nạp dữ liệu câu hỏi (Từ kết quả phân tích CV hoặc Bộ câu hỏi mẫu)
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
            setJdSkills(extractSkillNames(parsed));
            setIsPresetMode(false);
            setCheckedAuth(true);
            return;
          }
        } catch {
          // Fallback sang Preset mẫu nếu không đọc được
        }
      }

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
      setGuestResult({ totalScore, answers: finalAnswers });
      setSaveError("Không thể lưu trực tuyến: " + (error?.message || "unknown") + " — kết quả hiển thị bên dưới:");
      setPhase("finished");
      return;
    }

    router.push(`/dashboard/interview/${data.id}`);
  }, [analysisJobId, candidateName, jobTitle, questions, router]);

  const advanceToNext = useCallback((record: AnswerRecord) => {
    stopListening();
    stopAllAudio();
    resetTranscript();
    prevTranscriptRef.current = "";

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
  }, [currentIndex, questions, finishInterview, stopListening, resetTranscript, stopAllAudio]);

  const handleSubmitAnswer = async () => {
    stopListening();
    const timeUsed = TIME_PER_QUESTION_SEC - timeLeft;
    const q = questions[currentIndex];
    const answerText = answerDraftRef.current.trim();

    setIsEvaluating(true);
    let finalScore = 0;
    let feedback = "";
    let correctedText = answerText;

    try {
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          answer: answerText,
          expected: q.expected || [],
          sample_answer: q.sample_answer || "",
          red_flags: q.redFlags || [],
          skill_tag: q.skill || q.skill_tag || "",
          jd_skills: jdSkills || [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const base = typeof data.score === "number" ? data.score : scoreAnswer(answerText, q.expected);
        finalScore = Math.round(base * timeMultiplier(timeUsed));
        feedback = data.feedback || "";
        correctedText = data.correctedText || answerText;
      } else {
        const base = scoreAnswer(answerText, q.expected);
        finalScore = Math.round(base * timeMultiplier(timeUsed));
      }
    } catch (err) {
      console.warn("[Interview] Lỗi evaluate API, dùng fallback heuristic:", err);
      const base = scoreAnswer(answerText, q.expected);
      finalScore = Math.round(base * timeMultiplier(timeUsed));
    } finally {
      setIsEvaluating(false);
    }

    const record: AnswerRecord = {
      question_id: q.id,
      category: q.category,
      question: q.question,
      expected: q.expected,
      red_flags: q.redFlags,
      time_limit_sec: TIME_PER_QUESTION_SEC,
      time_used_sec: timeUsed,
      answer_text: answerText,
      question_score: finalScore,
      outcome: "submitted",
      answered_at: new Date().toISOString(),
      feedback,
      corrected_text: correctedText,
    };

    advanceToNext(record);
  };

  const handleSkip = () => {
    stopListening();
    const timeUsed = TIME_PER_QUESTION_SEC - timeLeft;
    const q = questions[currentIndex];
    const record: AnswerRecord = {
      question_id: q.id,
      category: q.category,
      question: q.question,
      expected: q.expected,
      red_flags: q.redFlags,
      time_limit_sec: TIME_PER_QUESTION_SEC,
      time_used_sec: timeUsed,
      answer_text: answerDraftRef.current.trim(),
      question_score: 0,
      outcome: "skipped",
      answered_at: new Date().toISOString(),
    };
    advanceToNext(record);
  };

  const handleTimeout = useCallback(() => {
    stopListening();
    const q = questions[currentIndex];
    const record: AnswerRecord = {
      question_id: q.id,
      category: q.category,
      question: q.question,
      expected: q.expected,
      red_flags: q.redFlags,
      time_limit_sec: TIME_PER_QUESTION_SEC,
      time_used_sec: TIME_PER_QUESTION_SEC,
      answer_text: answerDraftRef.current.trim(),
      question_score: 0,
      outcome: "timeout",
      answered_at: new Date().toISOString(),
    };
    advanceToNext(record);
  }, [currentIndex, questions, advanceToNext, stopListening]);

  // Đếm ngược 3 phút (180s) / câu — tạm dừng khi đang đánh giá kết quả
  useEffect(() => {
    if (phase !== "running") return;
    if (isEvaluating) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, isEvaluating, handleTimeout]);

  // Bắt đầu phỏng vấn — tự động phát âm thanh câu hỏi số 1 ngay lập tức
  function handleStart() {
    setCurrentIndex(0);
    setAnswerDraft("");
    setTimeLeft(TIME_PER_QUESTION_SEC);
    setCollected([]);
    setAudioUrls(null);
    setAudioNote("");
    setAudioJobId(null);
    setAudioJobActive(false);
    playedAudioRef.current = new Set();
    stopListening();
    stopAllAudio();
    resetTranscript();
    prevTranscriptRef.current = "";

    if (questions.length === 0) return;

    // Chuyển thẳng vào running để bắt đầu ngay tức thì, không bắt user chờ
    setPhase("running");

    // Tự động phát âm thanh câu hỏi đầu tiên bằng tiếng Việt (Nữ Hà Nội chuẩn)
    setTimeout(() => {
      playQuestionAudio(0);
    }, 350);

    // Kích hoạt ngầm audio job nếu Supabase có cấu hình
    try {
      const supabase = createClient();
      supabase
        .from("interview_audio_jobs")
        .insert({
          analysis_job_id: analysisJobId,
          voice: selectedVoice,
          questions: questions.map((q) => q.question),
        })
        .select("id")
        .single()
        .then(
          ({ data: job }) => {
            if (job?.id) {
              setAudioJobId(job.id);
              setAudioJobActive(true);
            }
          },
          () => {}
        );
    } catch {}
  }

  // Poll nền: lấy audio các câu tiếp theo khi worker sinh xong (nếu có worker chạy)
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

  // Tự động phát âm thanh đọc câu hỏi khi chuyển sang câu mới
  useEffect(() => {
    if (phase !== "running" || questions.length === 0) return;
    if (playedAudioRef.current.has(currentIndex)) return;
    playedAudioRef.current.add(currentIndex);

    const timer = setTimeout(() => {
      playQuestionAudio(currentIndex);
    }, 350);

    return () => clearTimeout(timer);
  }, [phase, currentIndex, questions, playQuestionAudio]);

  if (!checkedAuth) {
    return (
      <div className="bg-[#f8f9fc] min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col selection:bg-[#c026d3]/20 selection:text-[#0037b0]">
      <Header />
      <main className="flex-1 pt-16 flex flex-col">
        <section className="w-full px-4 sm:px-8 lg:px-12 py-8 flex-1">
          {phase === "intro" ? (
            <div className="space-y-6">
              {/* Header Intro */}
              <div className="text-center max-w-3xl mx-auto mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">record_voice_over</span>
                </div>
                <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[26px] sm:text-[32px] font-extrabold text-[#0b1c30] tracking-tight">
                  Phòng luyện phỏng vấn AI
                </h1>
                <p className="text-[14px] sm:text-[15px] text-[#64748b] mt-2 leading-relaxed">
                  {isPresetMode
                    ? "Luyện phản xạ phỏng vấn với các câu hỏi tình huống thực tế. Hỗ trợ trả lời bằng giọng nói trực tiếp qua Web Speech API và chấm điểm tự động."
                    : `Câu hỏi được AI đối soát và cá nhân hóa theo khoảng trống năng lực trong CV của bạn cho vị trí ${jobTitle}.`}
                </p>
              </div>

              {/* Grid 2 cột toàn màn hình */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Cột trái: Chọn vị trí mẫu + Quy chế thi & Hướng dẫn */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Banner Chế độ Preset nếu chưa phân tích CV */}
                  {isPresetMode && (
                    <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-[#0037b0]">tips_and_updates</span>
                          <span className="text-[14px] font-bold text-[#0b1c30]">
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(
                          [
                            { key: "frontend", label: "Frontend Engineer", icon: "terminal", desc: "React, TS, Tối ưu Web" },
                            { key: "pm", label: "Product Lead", icon: "view_kanban", desc: "Roadmap, Agile, Metric" },
                            { key: "sales", label: "Sales B2B", icon: "trending_up", desc: "Đàm phán, Chốt deal" },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => selectPreset(item.key)}
                            className={`flex flex-col gap-1.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                              activePresetKey === item.key
                                ? "bg-[#eff4ff] border-[#0037b0] text-[#0037b0] shadow-sm ring-2 ring-[#0037b0]/20 font-bold"
                                : "bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:bg-white hover:border-[#cbd5e1] font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                              <span className="text-[13px] truncate">{item.label}</span>
                            </div>
                            <span className="text-[11px] text-[#64748b]">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thông tin bài thi & Quy chế */}
                  <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#0b1c30] flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[18px] text-[#059669]">verified_user</span>
                        Quy chế phỏng vấn & Hướng dẫn tương tác
                      </h3>
                      <div className="space-y-3 text-[13px] text-[#475569] leading-relaxed">
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <span className="material-symbols-outlined text-[18px] text-[#059669] shrink-0 mt-0.5">timer</span>
                          <div>
                            <strong className="text-[#0b1c30]">Thời gian & Thang điểm:</strong> Mỗi câu có tối đa <strong>3 phút (180s)</strong>. Nộp bài trong phút đầu tiên để đạt điểm tối ưu (100%), từ phút thứ 2 hệ số điểm sẽ giảm dần theo thời gian.
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <span className="material-symbols-outlined text-[18px] text-[#0037b0] shrink-0 mt-0.5">mic</span>
                          <div>
                            <strong className="text-[#0b1c30]">Trả lời bằng giọng nói (0ms latency):</strong> Bấm micro để trả lời trực tiếp qua <strong>Web Speech API</strong> tiếng Việt thời gian thực, hoặc gõ văn bản tùy thích.
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <span className="material-symbols-outlined text-[18px] text-[#0284c7] shrink-0 mt-0.5">volume_up</span>
                          <div>
                            <strong className="text-[#0b1c30]">Phỏng vấn viên AI (VieNeu-TTS):</strong> Đọc câu hỏi bằng giọng nói tự nhiên. Micro được tự động tạm khóa trong lúc AI đang đọc để chống hú vang.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Cấu hình giọng đọc & Nút bắt đầu */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 lg:p-7">
                  <div className="space-y-6">
                    <div className="pb-4 border-b border-[#f1f5f9]">
                      <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Phiên phỏng vấn hiện tại</span>
                      <h2 className="text-[18px] font-bold text-[#0b1c30] mt-1">{jobTitle}</h2>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[12px] bg-[#eff4ff] text-[#0037b0] px-2.5 py-1 rounded-md font-semibold border border-[#dce1ff]">
                          <span className="material-symbols-outlined text-[14px]">help</span>
                          {questions.length} câu hỏi
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] bg-[#f8fafc] text-[#475569] px-2.5 py-1 rounded-md font-medium border border-[#e2e8f0]">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          ~{questions.length * 3} phút
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="p-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]/80 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0037b0] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <span className="material-symbols-outlined text-[22px]">record_voice_over</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#0b1c30]">Giọng đọc phỏng vấn:</span>
                            <span className="text-[11px] font-extrabold text-[#0037b0] bg-[#dbeafe] px-2 py-0.5 rounded">
                              {DEFAULT_VOICE_LABEL}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#475569] mt-1.5 leading-relaxed">
                            Mặc định cố định giọng nữ Hà Nội chuẩn tự nhiên. Hệ thống tự động đọc to từng câu hỏi bằng tiếng Việt ngay khi bắt đầu.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#f1f5f9]">
                    <button
                      onClick={handleStart}
                      className="w-full py-4 rounded-xl btn-gradient-cta text-[15px] cursor-pointer active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                      Bắt đầu phỏng vấn ngay
                    </button>
                    <p className="text-center text-[11px] text-[#94a3b8] mt-2.5">
                      Hỗ trợ cả trả lời bằng micro trực tiếp lẫn nhập liệu bàn phím
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : phase === "preparing" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-12 text-center max-w-lg mx-auto my-12">
              <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[40px] mb-4 block">progress_activity</span>
              <p className="text-[#0b1c30] font-bold text-[18px] mb-2">Đang chuẩn bị giọng đọc phỏng vấn viên...</p>
              <p className="text-[13px] text-[#64748b] leading-relaxed">
                Đang nạp giọng đọc cho câu hỏi đầu tiên (VieNeu-TTS). Quá trình phỏng vấn sẽ bắt đầu sau giây lát.
              </p>
            </div>
          ) : phase === "running" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột chính (8 cols): Nội dung câu hỏi và khu vực trả lời */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#0037b0] bg-[#eff4ff] px-3 py-1 rounded-md border border-[#dce1ff]">
                      <span className="material-symbols-outlined text-[15px]">quiz</span>
                      Câu {currentIndex + 1}/{questions.length} — {questions[currentIndex]?.category}
                    </span>
                    {isEvaluating && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-[#eff6ff] text-[#0037b0] border border-[#bfdbfe] shadow-xs">
                        <span className="material-symbols-outlined text-[16px] animate-spin text-[#0037b0]">progress_activity</span>
                        <span>Đang đánh giá câu trả lời...</span>
                      </span>
                    )}
                  </div>

                  <p className="font-[family-name:var(--font-plus-jakarta)] text-[18px] sm:text-[20px] font-bold text-[#0b1c30] leading-relaxed mb-4">
                    {questions[currentIndex]?.question}
                  </p>

                  {/* Thanh nghe lại câu hỏi — tự động đọc to và bấm để nghe lại bất cứ lúc nào */}
                  <div className="mb-4 flex flex-wrap items-center gap-2.5">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      ref={questionAudioRef}
                      className="hidden"
                      onPlay={handleQuestionAudioPlay}
                      onEnded={handleQuestionAudioStop}
                      onPause={handleQuestionAudioStop}
                      onError={handleQuestionAudioStop}
                    />
                    <button
                      type="button"
                      onClick={() => playQuestionAudio(currentIndex)}
                      className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isSpeaking
                          ? "bg-[#0037b0] text-white shadow-sm ring-2 ring-[#0037b0]/20 animate-pulse"
                          : "bg-[#eff4ff] text-[#0037b0] hover:bg-[#dbeafe] border border-[#bfdbfe]"
                      }`}
                      title="Bấm để nghe đọc lại câu hỏi bằng giọng nữ Hà Nội chuẩn"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isSpeaking ? "graphic_eq" : "volume_up"}
                      </span>
                      <span>{isSpeaking ? "Đang đọc câu hỏi..." : "Nghe lại câu hỏi"}</span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#1e40af] bg-[#eff6ff] px-2.5 py-1 rounded-lg font-semibold border border-[#bfdbfe]/60">
                      <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-[#2563eb] animate-ping" : "bg-[#10b981]"}`}></span>
                      Giọng đọc: {DEFAULT_VOICE_LABEL}
                    </span>
                  </div>

                  {/* Ô soạn thảo câu trả lời */}
                  <textarea
                    autoFocus
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-[15px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0037b0] focus:bg-white transition-all resize-none leading-relaxed"
                    rows={9}
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    placeholder="Nhập câu trả lời của bạn tại đây, hoặc bấm nút micro bên dưới để trả lời bằng giọng nói..."
                  />

                  {/* Hiển thị nhận diện thời gian thực (0ms) với Web Speech API */}
                  {isListening && (
                    <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[13px] flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2 text-[#1e40af] overflow-hidden">
                        <div className="flex items-end gap-0.5 h-4 shrink-0 pb-0.5" aria-hidden="true">
                          <span className="w-1 bg-[#0037b0] rounded-full animate-pulse h-2"></span>
                          <span className="w-1 bg-[#1d4ed8] rounded-full animate-pulse h-3.5"></span>
                          <span className="w-1 bg-[#2563eb] rounded-full animate-pulse h-2.5"></span>
                          <span className="w-1 bg-[#0037b0] rounded-full animate-pulse h-4"></span>
                          <span className="w-1 bg-[#3b82f6] rounded-full animate-pulse h-2"></span>
                        </div>
                        <span className="font-semibold text-[#0037b0] shrink-0">Đang nghe trực tiếp:</span>
                        <span className="italic truncate text-[#1d4ed8]">
                          {normalizedInterim || "Đang chờ giọng nói của bạn (0ms latency)..."}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#2563eb] bg-[#dbeafe] px-2 py-0.5 rounded-md shrink-0">
                        Web Speech API
                      </span>
                    </div>
                  )}

                  {/* Trả lời bằng giọng nói qua Web Speech API */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f1f5f9]">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        disabled={!isSpeechSupported || isSpeaking || isEvaluating}
                        className={`px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                          isListening
                            ? "bg-[#ba1a1a] text-white hover:bg-[#93000a] shadow-sm animate-pulse"
                            : isSpeaking
                            ? "bg-[#f1f5f9] text-[#94a3b8] border border-[#e2e8f0] cursor-not-allowed"
                            : !isSpeechSupported
                            ? "bg-[#f8fafc] text-[#94a3b8] border border-[#e2e8f0] cursor-not-allowed"
                            : "bg-white border border-[#c4c5d7]/80 text-[#0037b0] hover:bg-[#eff4ff] hover:border-[#0037b0]"
                        }`}
                        title={
                          isSpeaking
                            ? "Phỏng vấn viên đang đọc câu hỏi, microphone tạm khóa"
                            : !isSpeechSupported
                            ? "Trình duyệt không hỗ trợ Web Speech API"
                            : isListening
                            ? "Bấm để dừng thu âm"
                            : "Bấm để bắt đầu trả lời bằng giọng nói"
                        }
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isListening ? "animate-pulse" : ""}`}>
                          {isListening ? "stop_circle" : isSpeaking ? "volume_up" : "mic"}
                        </span>
                        <span>
                          {isListening
                            ? "Dừng thu âm"
                            : isSpeaking
                            ? "Phỏng vấn viên đang nói..."
                            : "Trả lời bằng giọng nói"}
                        </span>
                      </button>

                      <span className="text-[12px] text-[#64748b]">
                        {isSpeaking && (
                          <span className="text-[#0284c7] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">volume_up</span>
                            Đang phát câu hỏi — micro tạm khóa để chống lặp tiếng.
                          </span>
                        )}
                        {!isSpeaking && isListening && "Web Speech API đang thu âm trực tiếp tiếng Việt. Bạn có thể nói tự nhiên."}
                        {!isSpeaking && !isListening && speechError && (
                          <span className="text-[#ba1a1a]">{speechError}</span>
                        )}
                        {!isSpeaking && !isListening && !speechError && isSpeechSupported && (
                          "Có thể thu âm nhiều lần hoặc gõ phím bổ sung tùy ý."
                        )}
                      </span>
                    </div>

                    <span className="text-[12px] text-[#8fa5c0] font-medium">{answerDraft.trim().length} ký tự</span>
                  </div>

                  {/* Fallback khi trình duyệt không hỗ trợ */}
                  {!isSpeechSupported && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-[12px] flex items-start gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#d97706] shrink-0">info</span>
                      <span>
                        Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Vui lòng sử dụng <strong>Chrome</strong> hoặc <strong>Edge</strong> để trả lời bằng giọng nói, hoặc gõ phím trực tiếp.
                      </span>
                    </div>
                  )}

                  {/* Nút Skip & Submit */}
                  <div className="mt-5 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={isEvaluating}
                      className="btn-secondary px-4 py-2.5 text-[13px] flex items-center gap-1.5 cursor-pointer"
                      title="Bỏ qua câu này — sẽ bị 0 điểm"
                    >
                      <span className="material-symbols-outlined text-[16px]">skip_next</span>
                      Bỏ qua câu này
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={isEvaluating}
                      className={`px-6 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isEvaluating
                          ? "bg-[#e5eeff] text-[#64748b] cursor-wait"
                          : "bg-[#1d4ed8] text-white hover:bg-[#0037b0] hover:shadow-md"
                      }`}
                    >
                      {isEvaluating && (
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      )}
                      <span>
                        {isEvaluating
                          ? "Đang đánh giá..."
                          : currentIndex + 1 >= questions.length
                          ? "Nộp & xem kết quả"
                          : "Nộp & câu tiếp theo"}
                      </span>
                      {!isEvaluating && (
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cột phụ (4 cols): Đồng hồ thời gian & Tiến trình bài thi */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                {/* Card Đồng hồ đếm ngược */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Thời gian còn lại</span>
                    <span
                      className={`px-3 py-1 rounded-full text-[14px] font-mono font-bold ${
                        timeLeft <= 10 ? "bg-[#ffdad6] text-[#93000a] animate-pulse" : "bg-[#e5eeff] text-[#0037b0]"
                      }`}
                    >
                      {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#e5eeff] rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? "bg-[#ba1a1a]" : "bg-[#1d4ed8]"}`}
                      style={{ width: `${(timeLeft / TIME_PER_QUESTION_SEC) * 100}%` }}
                    />
                  </div>

                  <p className="text-[12px] text-[#64748b] leading-relaxed">
                    {timeLeft > TIME_PER_QUESTION_SEC - FULL_SCORE_WINDOW_SEC
                      ? "⚡ Đang trong phút đầu — nộp trong giai đoạn này để được trọn vẹn điểm tối đa (100%)."
                      : "⏱️ Đã qua 1 phút — điểm số sẽ giảm dần theo thời lượng trả lời."}
                  </p>
                </div>

                {/* Card Tiến trình câu hỏi */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6">
                  <h4 className="text-[13px] font-bold text-[#0b1c30] mb-3 flex items-center justify-between">
                    <span>Tiến trình phỏng vấn</span>
                    <span className="text-[#0037b0] font-bold">{currentIndex + 1}/{questions.length}</span>
                  </h4>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-[12px] flex items-center justify-between border transition-all ${
                          idx === currentIndex
                            ? "bg-[#eff4ff] border-[#0037b0] text-[#0037b0] font-bold shadow-xs"
                            : idx < currentIndex
                            ? "bg-[#f8fafc] border-[#e2e8f0] text-[#059669]"
                            : "bg-white border-[#f1f5f9] text-[#94a3b8]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            {idx < currentIndex ? "check_circle" : idx === currentIndex ? "radio_button_checked" : "radio_button_unchecked"}
                          </span>
                          <span className="truncate">Câu {idx + 1}: {q.category}</span>
                        </div>
                        <span className="text-[11px] shrink-0 font-medium">
                          {idx === currentIndex ? "Đang làm" : idx < currentIndex ? "Đã xong" : "Chờ"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mẹo phỏng vấn STAR */}
                <div className="bg-gradient-to-br from-[#eff6ff] to-[#f8f9ff] rounded-2xl border border-[#bfdbfe]/60 p-5">
                  <h4 className="text-[13px] font-bold text-[#1e40af] flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-[#0037b0]">lightbulb</span>
                    Gợi ý cấu trúc trả lời (STAR)
                  </h4>
                  <ul className="text-[12px] text-[#334155] space-y-1.5 leading-relaxed">
                    <li><strong>S (Situation):</strong> Nêu bối cảnh hoặc tình huống thực tế.</li>
                    <li><strong>T (Task):</strong> Nhiệm vụ cụ thể cần giải quyết.</li>
                    <li><strong>A (Action):</strong> Các bước hành động kỹ thuật bạn đã thực hiện.</li>
                    <li><strong>R (Result):</strong> Kết quả đạt được (số liệu định lượng).</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : phase === "saving" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-12 text-center max-w-lg mx-auto my-12">
              <span className="material-symbols-outlined animate-spin text-[#0037b0] text-[40px] mb-4 block">progress_activity</span>
              <p className="text-[#0b1c30] font-bold text-[18px]">Đang phân tích và tổng kết kết quả...</p>
              <p className="text-[13px] text-[#64748b] mt-1">Hệ thống AI đang chấm điểm chi tiết theo thang năng lực.</p>
            </div>
          ) : (
            /* Phase: Finished - Bảng tổng kết kết quả phỏng vấn full màn hình */
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-10">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center mx-auto mb-3 ring-4 ring-[#ecfdf5]">
                  <span className="material-symbols-outlined text-[32px]">military_tech</span>
                </div>
                <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] sm:text-[28px] font-extrabold text-[#0b1c30]">
                  Kết quả phỏng vấn thử nghiệm
                </h2>
                <p className="text-[14px] text-[#64748b] mt-1">
                  Vị trí: <strong className="text-[#0b1c30]">{jobTitle}</strong>
                </p>
                {saveError && (
                  <p className="text-[12px] text-amber-600 mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    {saveError}
                  </p>
                )}
              </div>

              {/* Thẻ điểm tổng */}
              {guestResult && (
                <div className="mb-8 p-6 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-[26px] shadow-sm ${
                      guestResult.totalScore >= 70
                        ? "bg-[#ecfdf5] text-[#059669]"
                        : guestResult.totalScore >= 50
                        ? "bg-[#fffbeb] text-[#d97706]"
                        : "bg-[#fef2f2] text-[#dc2626]"
                    }`}>
                      {guestResult.totalScore}
                    </div>
                    <div>
                      <h4 className="font-bold text-[17px] text-[#0b1c30]">
                        Điểm đánh giá trung bình
                      </h4>
                      <p className="text-[13px] text-[#64748b] mt-0.5">
                        Đã trả lời {guestResult.answers.length} câu hỏi theo thang điểm chuẩn năng lực ngành nghề.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/login?next=/interview"
                    className="px-5 py-3 rounded-xl bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[13px] font-bold transition-all flex items-center gap-2 shrink-0 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Đăng nhập để lưu vào hồ sơ
                  </Link>
                </div>
              )}

              {/* Chi tiết từng câu và phản hồi AI */}
              {guestResult && (
                <div className="space-y-4 mb-8">
                  <h4 className="font-bold text-[16px] text-[#0b1c30] mb-3">Chi tiết từng câu hỏi & Đánh giá chuyên sâu:</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {guestResult.answers.map((ans, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-[#e2e8f0] bg-white text-[13px] shadow-xs">
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <span className="font-bold text-[14px] text-[#0b1c30]">
                            Câu {idx + 1}: {ans.question}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[12px] font-extrabold shrink-0 ${
                            ans.question_score >= 70
                              ? "bg-[#ecfdf5] text-[#059669]"
                              : ans.question_score >= 50
                              ? "bg-[#fffbeb] text-[#d97706]"
                              : "bg-[#fef2f2] text-[#dc2626]"
                          }`}>
                            {ans.question_score}/100 đ
                          </span>
                        </div>
                        <p className="text-[13px] text-[#475569] bg-[#f8fafc] p-3 rounded-xl border border-[#f1f5f9] leading-relaxed">
                          <strong className="text-[#0b1c30]">Trả lời của bạn:</strong> {ans.answer_text || "(Không có nội dung trả lời / đã bỏ qua)"}
                        </p>
                        {ans.feedback && (
                          <p className="mt-2.5 text-[13px] text-[#1e40af] bg-[#eff6ff] p-3 rounded-xl border border-[#bfdbfe]/60 leading-relaxed">
                            <strong className="text-[#0037b0]">Nhận xét chuyên gia AI:</strong> {ans.feedback}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("intro");
                    setGuestResult(null);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  Luyện tập vị trí khác
                </button>
                <Link
                  href="/score"
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#0037b0] text-white text-[13px] font-bold hover:bg-[#1d4ed8] transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
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
