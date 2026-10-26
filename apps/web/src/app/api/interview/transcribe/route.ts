import { NextResponse } from "next/server";

/**
 * @deprecated Audio-based Gemini STT has been deprecated in favor of client-side Web Speech API.
 * Web Speech API provides 0ms real-time latency, zero audio token consumption, and native Vietnamese transcription.
 */
export async function POST() {
  try {
    return NextResponse.json(
      {
        message: "Gemini Audio STT is deprecated. Please use client-side Web Speech API via useSpeechRecognition hook.",
        text: "",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
