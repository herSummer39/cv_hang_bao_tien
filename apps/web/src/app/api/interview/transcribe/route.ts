import { NextResponse } from "next/server";

/**
 * @deprecated Endpoint nhận file audio đã ngừng dùng. Nhận diện giọng nói chạy
 * trực tiếp trên trình duyệt bằng Web Speech API (xem hooks/useSpeechRecognition.ts),
 * không còn upload audio hay gọi bất kỳ API ngoài nào.
 */
export async function POST() {
  return NextResponse.json(
    {
      message: "Audio STT endpoint is disabled. Use client-side Web Speech API (useSpeechRecognition).",
      text: "",
    },
    { status: 200 }
  );
}
