// Web Worker chạy model ASR (Speech-to-Text) THẬT cho tiếng Việt — PhoWhisper
// của VinAI (cùng nhóm nghiên cứu tạo ra PhoBERT mà backend worker.py đang dùng
// cho M1 NER), bản ONNX cộng đồng convert để chạy được với @huggingface/transformers
// (transformers.js) trực tiếp trong trình duyệt.
//
// KHÔNG gọi API/LLM ngoài: model được tải 1 lần từ Hugging Face Hub (giống việc
// tải các model M1/M2/M3 khi deploy), sau đó toàn bộ suy luận chạy 100% local
// trên máy người dùng — không có audio nào được gửi lên server nào cả.
//
// Chạy trong Worker riêng (không phải main thread) để không làm treo UI khi
// model đang tải/suy luận, đúng khuyến nghị chính thức của transformers.js.
import { pipeline } from "@huggingface/transformers";

const ASR_MODEL_ID = "huuquyet/PhoWhisper-tiny";

class AsrPipelineSingleton {
  static task = "automatic-speech-recognition";
  static model = ASR_MODEL_ID;
  static instance = null;

  static async getInstance(progress_callback) {
    if (this.instance === null) {
      // Thu tai ban da luong tu hoa (q8) truoc - nhe hon nhieu (~1/4 dung
      // luong) va tai/chay nhanh hon dang ke so voi ban day du (fp32).
      // Neu repo model nay khong co san file q8 (community convert co the
      // chi export fp32), pipeline() se bao loi ngay khi tai (khong phai
      // luc dang transcribe) - luc do fallback nguyen ban fp32 nhu truoc.
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
        dtype: "q8",
      }).catch((err) => {
        console.warn(
          "[asr-worker] Tai ban q8 (luong tu hoa) that bai, dung ban goc (fp32):",
          err
        );
        // KHONG reset this.instance = null o day - de singleton giu lai dung
        // promise nay (se resolve ra pipeline fp32 fallback) cho cac lan goi
        // getInstance() sau tai su dung lai, khong thu lai q8 (chac chan fail
        // lai) moi lan ghi am tiep theo.
        return pipeline(this.task, this.model, { progress_callback });
      });
    }
    return this.instance;
  }
}

self.addEventListener("message", async (event) => {
  const { audio } = event.data;
  try {
    const transcriber = await AsrPipelineSingleton.getInstance((data) => {
      self.postMessage({ status: "progress", data });
    });
    const output = await transcriber(audio, {
      language: "vietnamese",
      task: "transcribe",
    });
    const text = Array.isArray(output) ? output[0]?.text ?? "" : output?.text ?? "";
    self.postMessage({ status: "complete", text: text.trim() });
  } catch (err) {
    self.postMessage({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
