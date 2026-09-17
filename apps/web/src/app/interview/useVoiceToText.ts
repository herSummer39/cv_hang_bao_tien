"use client";
import { useRef, useState, useCallback, useEffect } from "react";

// "transcribing" bao gồm cả việc tải model ASR lần đầu (chỉ xảy ra 1 lần / phiên
// trình duyệt) VÀ việc suy luận thật — modelProgressPct phân biệt 2 giai đoạn đó
// khi cần hiển thị chi tiết hơn cho người dùng.
export type VoiceStatus =
  | "idle"          // chưa làm gì / xong 1 lượt, sẵn sàng ghi âm tiếp
  | "recording"      // đang ghi âm
  | "transcribing"   // đã dừng ghi âm — đang tải model (nếu lần đầu) + chuyển giọng nói thành văn bản
  | "error";

// Giải mã Blob ghi âm (webm/opus, mp4...) → Float32Array mono 16kHz — định dạng
// bắt buộc của Whisper/PhoWhisper. decodeAudioData tự resample về sampleRate của
// AudioContext nên chỉ cần tạo context đúng 16000Hz. Chạy ở main thread vì
// AudioContext không đảm bảo có sẵn trong Worker ở mọi trình duyệt.
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

// Hook dùng chung cho tính năng "trả lời phỏng vấn bằng giọng nói" — ứng viên có
// thể chọn ghi âm (hook này) HOẶC gõ tay trực tiếp vào ô trả lời, tuỳ ý, không
// bắt buộc phải dùng giọng nói.
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

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      // Tạo Worker MUỘN — chỉ khi người dùng thực sự bấm ghi âm lần đầu, để
      // không bắt ai cũng phải tải thư viện transformers.js nếu chỉ gõ tay.
      workerRef.current = new Worker(new URL("./asr-worker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current.onmessage = (event: MessageEvent) => {
        const msg = event.data as
          | { status: "progress"; data: { status?: string; progress?: number } }
          | { status: "complete"; text: string }
          | { status: "error"; error: string };
        if (msg.status === "progress") {
          if (typeof msg.data?.progress === "number") {
            setModelProgressPct(Math.round(msg.data.progress));
          }
        } else if (msg.status === "complete") {
          setModelProgressPct(null);
          setStatus("idle");
          onResultRef.current(msg.text);
        } else if (msg.status === "error") {
          setModelProgressPct(null);
          setErrorMsg("Chuyển giọng nói thành văn bản thất bại: " + msg.error);
          setStatus("error");
        }
      };
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg("");
    try {
      ensureWorker();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
  }, [ensureWorker]);

  // Hủy ghi âm đang chạy mà KHÔNG transcribe — dùng khi chuyển câu (hết giờ/bỏ
  // qua/nộp) để tắt mic ngay, tránh đoạn ghi âm của câu cũ bị lỡ tay tính vào
  // câu mới. An toàn khi gọi dù không có gì đang ghi âm.
  const cancelRecording = useCallback(() => {
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
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStatus("transcribing");
      // Model tải lần đầu (nếu chưa từng tải trong phiên này) có thể mất một
      // lúc — hiện trạng thái "loading-model" xen giữa qua progress callback.
      setModelProgressPct((p) => (p === null ? 0 : p));
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const pcm = await blobToPcm16k(blob);
        const worker = ensureWorker();
        worker.postMessage({ audio: pcm }, [pcm.buffer]);
      } catch (e) {
        setErrorMsg(
          "Xử lý audio ghi âm thất bại: " + (e instanceof Error ? e.message : "unknown")
        );
        setStatus("error");
      }
    };
    recorder.stop();
  }, [ensureWorker]);

  return { status, modelProgressPct, errorMsg, startRecording, stopRecording, cancelRecording };
}
