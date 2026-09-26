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

// PhoWhisper-tiny (ban cu) qua nho -> nhan dien sai nhieu tu. PhoWhisper-base
// (ban ONNX cua cung nguoi convert huuquyet) chinh xac hon ro ret, doi lai
// model nang hon mot chut (tai lan dau lau hon vai giay, sau do trinh duyet
// cache lai qua IndexedDB nen cac lan sau khong phai tai lai). Neu van chua
// du chinh xac, buoc tiep theo la "huuquyet/PhoWhisper-small" (chinh xac hon
// nua, nhung tai lan dau lau hon).
const ASR_MODEL_ID = "huuquyet/PhoWhisper-base";

class AsrPipelineSingleton {
  static task = "automatic-speech-recognition";
  static model = ASR_MODEL_ID;
  static instance = null;

  static async getInstance(progress_callback) {
    // Bo ban q8: luong tu hoa lam Whisper nhan dien sai nhieu hon. Day gio chi
    // la duong DU PHONG (nhan dien chinh chay tren worker.py co GPU), uu tien
    // do chinh xac hon toc do.
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
    // chunk_length_s: Whisper chi nghe duoc 30s/lan - khong chunk thi cau tra
    // loi dai hon 30s bi mat het phan sau (nguyen nhan "nhan dien sai/thieu").
    const output = await transcriber(audio, {
      language: "vietnamese",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
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
