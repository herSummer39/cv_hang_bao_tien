import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Tách đoạn văn bản thành các câu / cụm từ ngắn (<= 150 ký tự)
 * để tương thích hoàn hảo với bộ giải mã âm thanh tiếng Việt.
 */
function splitIntoChunks(text: string, maxLen = 150): string[] {
  // Loại bỏ ký tự đặc biệt gây gián đoạn âm thanh
  const clean = text
    .replace(/["“”«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  // Tách theo dấu câu . ? ! ; , hoặc khoảng trắng
  const sentences = clean.match(/[^.?!;]+[.?!;]?/g) || [clean];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;

    if (current.length + s.length + 1 <= maxLen) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) chunks.push(current);

      // Nếu bản thân câu đó dài hơn maxLen thì tách theo dấu phẩy hoặc khoảng trắng
      if (s.length > maxLen) {
        const subParts = s.split(/([,:]\s*|\s+)/);
        let subCurrent = "";
        for (const part of subParts) {
          if (subCurrent.length + part.length <= maxLen) {
            subCurrent += part;
          } else {
            if (subCurrent.trim()) chunks.push(subCurrent.trim());
            subCurrent = part;
          }
        }
        if (subCurrent.trim()) current = subCurrent.trim();
        else current = "";
      } else {
        current = s;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.trim();

  if (!text) {
    return NextResponse.json({ error: "Thiếu nội dung câu hỏi" }, { status: 400 });
  }

  try {
    const chunks = splitIntoChunks(text);
    const audioBuffers: Buffer[] = [];

    // Tải các đoạn âm thanh giọng chuẩn nữ tiếng Việt
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=vi&client=tw-ob`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://translate.google.com/",
        },
      });

      if (!res.ok) {
        throw new Error(`TTS provider returned status ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    const combinedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(combinedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": combinedBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[Interview TTS API] Lỗi tạo âm thanh tiếng Việt:", error);
    return NextResponse.json(
      { error: "Không thể tạo giọng đọc tiếng Việt" },
      { status: 500 }
    );
  }
}
