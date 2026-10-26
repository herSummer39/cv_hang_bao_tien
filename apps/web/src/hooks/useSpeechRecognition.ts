"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API interface declarations for TypeScript compatibility
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [isSupported] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    );
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const shouldRestartRef = useRef<boolean>(false);

  // Sync ref with isListening state inside an effect (not during render)
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize SpeechRecognition instance on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "vi-VN";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalChunk += text + " ";
          } else {
            currentInterim += text;
          }
        }

        if (finalChunk) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // "no-speech" happens during pauses; do not treat as fatal error
        if (event.error === "no-speech") {
          return;
        }

        if (event.error === "not-allowed") {
          setError("Quyền truy cập microphone bị từ chối. Vui lòng cho phép truy cập micro trên trình duyệt.");
        } else if (event.error === "audio-capture") {
          setError("Không tìm thấy microphone trên thiết bị của bạn.");
        } else if (event.error === "network") {
          setError("Lỗi kết nối mạng khi xử lý giọng nói.");
        } else if (event.error !== "aborted") {
          setError(`Lỗi nhận diện giọng nói: ${event.error}`);
        }

        setIsListening(false);
        shouldRestartRef.current = false;
      };

      recognition.onend = () => {
        setInterimTranscript("");
        // If still flagged as listening (e.g. browser timed out after brief pause), auto-restart
        if (shouldRestartRef.current && isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error("[useSpeechRecognition] Khởi tạo SpeechRecognition thất bại:", err);
    }

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (!isSupported) {
        setError("Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.");
      }
      return;
    }

    setError(null);
    shouldRestartRef.current = true;
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("already started")) {
        console.warn("[useSpeechRecognition] Start error:", err);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    setIsListening(false);
    setInterimTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
