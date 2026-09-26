"""
interview_tts.py — Sinh giọng đọc câu hỏi phỏng vấn bằng VieNeu-TTS (package
"vieneu"), chạy 100% local/offline (KHÔNG gọi API/LLM ngoài). Dùng lại đúng 7
mã giọng của tool video (html-render-video-v2-react).

Xử lý TỪNG CÂU MỘT (synthesize_one) thay vì cả 5 câu liền một mạch, để:
  - FE có audio câu 1 sau ~10s và bắt đầu phỏng vấn ngay, các câu sau sinh
    tiếp trong lúc ứng viên đang trả lời;
  - worker.py xen kẽ được job nhận diện giọng nói (ASR) giữa các câu, không
    bắt người dùng chờ TTS xong cả 5 câu.
"""
import logging
import os
import tempfile

log = logging.getLogger("worker")

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
        log.info("🔧 Đang load model VieNeu-TTS...")
        from vieneu import Vieneu
        _tts_instance = Vieneu()
        log.info("✅ VieNeu-TTS đã sẵn sàng.")
    return _tts_instance


def warm_up():
    """Load sẵn model lúc worker.py khởi động — tránh lần phỏng vấn đầu tiên
    phải chờ thêm thời gian load model (nguyên nhân FE bị quá thời gian chờ)."""
    _get_tts()


def synthesize_one(supabase, job_id: str, idx: int, text: str, voice_code: str) -> str:
    """Sinh audio cho 1 câu hỏi, upload lên Storage, trả về public URL."""
    voice_name = VOICE_MAP.get(voice_code, VOICE_MAP[DEFAULT_VOICE_CODE])
    tts = _get_tts()

    try:
        audio = tts.infer(text, voice=voice_name)
    except Exception as e:  # tên giọng không có trong bản vieneu đang cài
        log.warning(f"    ⚠️ Giọng '{voice_name}' lỗi ({e}) — dùng giọng mặc định của VieNeu")
        audio = tts.infer(text)

    with tempfile.TemporaryDirectory() as tmp_dir:
        wav_path = os.path.join(tmp_dir, f"q{idx}.wav")
        tts.save(audio, wav_path)
        with open(wav_path, "rb") as f:
            wav_bytes = f.read()

    storage_path = f"{job_id}/q{idx}.wav"
    supabase.storage.from_(STORAGE_BUCKET).upload(
        storage_path,
        wav_bytes,
        {"content-type": "audio/wav", "upsert": "true"},
    )
    return supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
