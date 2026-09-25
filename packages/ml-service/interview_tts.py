"""
interview_tts.py — Sinh giọng đọc câu hỏi phỏng vấn bằng VieNeu-TTS (package
"vieneu"), chạy 100% local/offline (KHÔNG gọi API/LLM ngoài — đúng ràng buộc
của đồ án). Dùng lại ĐÚNG 7 mã giọng + tên hiển thị đã cấu hình sẵn trong tool
video của Khánh (E:\\tool_obs_ctien\\html-render-video-v2-react\\ui\\index.html
/ scripts\\vieneu_tts.py) để không phải học lại 1 danh sách giọng khác.

Model VieNeu-TTS được load 1 lần duy nhất (singleton), giống cách M1/M2/M3
được load 1 lần khi worker.py khởi động — không load lại mỗi lần sinh audio.
"""
import logging
import os
import tempfile

log = logging.getLogger("worker")

# Mã giọng (dùng trong DB + FE dropdown) -> tên preset voice thật của VieNeu-TTS.
# Giữ đúng như VOICE_MAP trong scripts/vieneu_tts.py của tool video.
VOICE_MAP = {
    "Ly":    "Trúc Ly",     # nữ, miền Bắc (mặc định)
    "Ngoc":  "Bích Ngọc",   # nữ, miền Bắc
    "Doan":  "Thục Đoan",   # nữ, miền Nam
    "Binh":  "Thanh Bình",  # nam, miền Bắc
    "Tuyen": "Phạm Tuyên",  # nam, miền Bắc
    "Vinh":  "Xuân Vĩnh",   # nam, miền Nam
    "Son":   "Thái Sơn",    # nam, miền Nam
}
DEFAULT_VOICE_CODE = "Ly"
STORAGE_BUCKET = "interview-audio"

_tts_instance = None


def _get_tts():
    """Load model VieNeu-TTS 1 lần duy nhất (singleton)."""
    global _tts_instance
    if _tts_instance is None:
        log.info("  🔧 Đang load model VieNeu-TTS (lần đầu, có thể mất vài chục giây)...")
        from vieneu import Vieneu
        _tts_instance = Vieneu()
        log.info("  ✅ VieNeu-TTS đã sẵn sàng.")
    return _tts_instance


def synthesize_and_upload(supabase, job_id: str, questions: list, voice_code: str) -> list:
    """
    Sinh audio cho từng câu hỏi trong `questions`, upload lên Supabase Storage
    bucket `interview-audio`, trả về list public URL (ĐÚNG thứ tự với
    `questions`). Bucket phải đã được tạo + set public=true (xem migration
    migration_v12_interview_audio.sql) để get_public_url() dùng được ngay,
    không cần ký signed URL.
    """
    voice_name = VOICE_MAP.get(voice_code, VOICE_MAP[DEFAULT_VOICE_CODE])
    tts = _get_tts()

    urls = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        for idx, text in enumerate(questions):
            wav_path = os.path.join(tmp_dir, f"q{idx}.wav")
            audio = tts.infer(text, voice=voice_name)
            tts.save(audio, wav_path)

            with open(wav_path, "rb") as f:
                wav_bytes = f.read()

            storage_path = f"{job_id}/q{idx}.wav"
            supabase.storage.from_(STORAGE_BUCKET).upload(
                storage_path,
                wav_bytes,
                {"content-type": "audio/wav", "upsert": "true"},
            )
            public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            urls.append(public_url)
            log.info(f"    🔊 Câu {idx + 1}/{len(questions)} xong ({voice_name})")

    return urls
