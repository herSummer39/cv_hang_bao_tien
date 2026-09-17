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
      this.instance = pipeline(this.task, this.model, { progress_callback });
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
