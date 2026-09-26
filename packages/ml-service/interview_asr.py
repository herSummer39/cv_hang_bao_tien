"""
interview_asr.py — Nhận diện giọng nói (Speech-to-Text) câu trả lời phỏng vấn
bằng PhoWhisper của VinAI, chạy LOCAL trên worker.py (dùng GPU/CUDA nếu có),
KHÔNG gọi API/LLM ngoài.

Vì sao chuyển ASR từ trình duyệt về worker:
  - Trong trình duyệt (transformers.js, WASM/CPU) PhoWhisper chạy rất chậm và
    chỉ dùng được bản nhỏ (tiny/base) → nhận diện sai nhiều.
  - Ở worker có GPU (RTX 3050Ti) → chạy được bản lớn hơn (mặc định
    PhoWhisper-small), nhanh và chính xác hơn nhiều.
  - Câu trả lời dài hơn 30s được cắt chunk (chunk_length_s=30) — bản cũ trong
    trình duyệt KHÔNG chunk nên chỉ nhận được ~30s đầu, phần sau bị mất.

Đổi model bằng biến môi trường ASR_MODEL_ID trong .env.worker, vd:
  ASR_MODEL_ID=vinai/PhoWhisper-medium   (chính xác hơn nữa, nặng hơn)
"""
import io
import logging
import os
import wave

import numpy as np

log = logging.getLogger("worker")

ASR_MODEL_ID = os.environ.get("ASR_MODEL_ID", "vinai/PhoWhisper-small")
ANSWER_BUCKET = "interview-answers"

_asr = None


def _get_asr():
    global _asr
    if _asr is None:
        import torch
        from transformers import pipeline as hf_pipeline

        use_cuda = torch.cuda.is_available()
        log.info(f"🔧 Đang load ASR {ASR_MODEL_ID} ({'CUDA' if use_cuda else 'CPU'})...")
        _asr = hf_pipeline(
            "automatic-speech-recognition",
            model=ASR_MODEL_ID,
            device=0 if use_cuda else -1,
            torch_dtype=torch.float16 if use_cuda else torch.float32,
        )
        log.info("✅ ASR đã sẵn sàng.")
    return _asr


def warm_up():
    _get_asr()


def _wav_to_float32(wav_bytes: bytes):
    """Đọc WAV PCM 16-bit (FE đã resample về 16kHz mono) bằng thư viện chuẩn —
    không cần ffmpeg."""
    with wave.open(io.BytesIO(wav_bytes)) as w:
        sr = w.getframerate()
        channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        frames = w.readframes(w.getnframes())
    if sampwidth != 2:
        raise ValueError(f"Chỉ hỗ trợ WAV 16-bit, nhận được {sampwidth * 8}-bit")
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    return audio, sr


def transcribe(wav_bytes: bytes) -> str:
    audio, sr = _wav_to_float32(wav_bytes)
    if audio.size == 0:
        return ""
    asr = _get_asr()
    out = asr(
        {"raw": audio, "sampling_rate": sr},
        chunk_length_s=30,
        batch_size=4,
        generate_kwargs={"language": "vietnamese", "task": "transcribe"},
    )
    return (out.get("text") or "").strip()
