"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// "transcribing" = đã dừng ghi âm, đang chuyển giọng nói thành văn bản.
export type VoiceStatus =
  | "idle"          // chưa làm gì / xong 1 lượt, sẵn sàng ghi âm tiếp
  | "recording"      // đang ghi âm
  | "transcribing"   // đang nhận diện (worker.py, hoặc dự phòng trong trình duyệt)
  | "error";

// Nhận diện chính chạy trên worker.py (PhoWhisper-small, GPU) — nhanh và chính
// xác hơn nhiều so với chạy trong trình duyệt. Trình duyệt chỉ là đường dự
// phòng khi worker không phản hồi.
const ANSWER_BUCKET = "interview-answers";
const SERVER_ASR_TIMEOUT_MS = 90_000;

// Giải mã Blob ghi âm (webm/opus, mp4...) → Float32Array mono 16kHz — định dạng
// chuẩn của Whisper/PhoWhisper.
async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0).slice();
    }
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const merged = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) merged[i] = (left[i] + right[i]) / 2;
    return merged;
  } finally {
    audioCtx.close();
  }
}

// Float32 PCM → WAV 16-bit mono (worker đọc bằng thư viện chuẩn `wave`, không cần ffmpeg).
function pcmToWav16(pcm: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // kích thước chunk fmt
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function transcribeOnWorker(pcm: Float32Array): Promise<string> {
  const supabase = createClient();
  const path = `${crypto.randomUUID()}.wav`;
  const { error: upErr } = await supabase.storage
    .from(ANSWER_BUCKET)
    .upload(path, pcmToWav16(pcm), { contentType: "audio/wav" });
  if (upErr) throw new Error("upload ghi âm: " + upErr.message);

  const { data: job, error: insErr } = await supabase
    .from("interview_asr_jobs")
    .insert({ audio_path: path })
    .select("id")
    .single();
  if (insErr || !job?.id) throw new Error("tạo job: " + (insErr?.message || "unknown"));

  const deadline = Date.now() + SERVER_ASR_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 800));
    const { data: row } = await supabase
      .from("interview_asr_jobs")
      .select("status, transcript")
      .eq("id", job.id)
      .single();
    if (row?.status === "done") return (row.transcript as string) || "";
    if (row?.status === "error") throw new Error("worker báo lỗi khi nhận diện");
  }
  throw new Error("quá thời gian chờ worker.py");
}

// Hook dùng chung cho "trả lời phỏng vấn bằng giọng nói" — ứng viên có thể ghi
// âm (hook này) HOẶC gõ tay, tuỳ ý.
export function useVoiceToText(onResult: (text: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Mỗi lần huỷ (chuyển câu) tăng "thế hệ" — kết quả nhận diện về trễ của câu
  // cũ sẽ bị bỏ, không rơi nhầm vào ô trả lời của câu mới.
  const genRef = useRef(0);
  const workerGenRef = useRef(0);

  const deliver = useCallback((gen: number, text: string) => {
    if (gen !== genRef.current) return;
    setModelProgressPct(null);
    setStatus("idle");
    onResultRef.current(text);
  }, []);

  // Dự phòng: PhoWhisper chạy trong trình duyệt (chậm hơn, kém chính xác hơn).
  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("./asr-worker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current.onmessage = (event: MessageEvent) => {
        const msg = event.data as
          | { status: "progress"; data: { status?: string; progress?: number } }
          | { status: "complete"; text: string }
          | { status: "error"; error: string };
        if (workerGenRef.current !== genRef.current) return;
        if (msg.status === "progress") {
          if (typeof msg.data?.progress === "number") {
            setModelProgressPct(Math.round(msg.data.progress));
          }
        } else if (msg.status === "complete") {
          deliver(workerGenRef.current, msg.text);
        } else if (msg.status === "error") {
          setModelProgressPct(null);
          setErrorMsg("Chuyển giọng nói thành văn bản thất bại: " + msg.error);
          setStatus("error");
        }
      };
    }
    return workerRef.current;
  }, [deliver]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus("recording");
    } catch (e) {
      setErrorMsg(
        "Không thể truy cập microphone: " + (e instanceof Error ? e.message : "unknown")
      );
      setStatus("error");
    }
  }, []);

  // Huỷ ghi âm/nhận diện đang chạy mà KHÔNG lấy kết quả — dùng khi chuyển câu.
  const cancelRecording = useCallback(() => {
    genRef.current += 1;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    chunksRef.current = [];
    setModelProgressPct(null);
    setStatus("idle");
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const gen = genRef.current;
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStatus("transcribing");
      let pcm: Float32Array;
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        pcm = await blobToPcm16k(blob);
      } catch (e) {
        setErrorMsg(
          "Xử lý audio ghi âm thất bại: " + (e instanceof Error ? e.message : "unknown")
        );
        setStatus("error");
        return;
      }

      try {
        const text = await transcribeOnWorker(pcm);
        deliver(gen, text);
        return;
      } catch (e) {
        if (gen !== genRef.current) return;
        console.warn("[voice] Nhận diện trên worker.py thất bại, dùng dự phòng trong trình duyệt:", e);
      }

      // Dự phòng trong trình duyệt
      setModelProgressPct(0);
      workerGenRef.current = gen;
      ensureWorker().postMessage({ audio: pcm }, [pcm.buffer]);
    };
    recorder.stop();
  }, [deliver, ensureWorker]);

  return { status, modelProgressPct, errorMsg, startRecording, stopRecording, cancelRecording };
}
