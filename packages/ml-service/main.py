import os
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import io, re, pickle, logging
import numpy as np
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

BASE = Path(__file__).parent
M1_DIR = BASE / "models" / "m1_ner" / "final"
M2_DIR = BASE / "models" / "m2_embedding_quick" / "final"
M3_PKL = BASE / "models" / "m3_xgboost" / "xgboost_scorer.pkl"

_m1 = None
_m2 = None
_m3 = None
_m3_keys = None

def get_m1():
    global _m1
    if _m1 is None:
        logger.info("Loading M1 NER...")
        from transformers import pipeline
        _m1 = pipeline("token-classification", model=str(M1_DIR),
                       aggregation_strategy="simple", device=-1)
        logger.info("M1 ready!")
    return _m1

def get_m2():
    global _m2
    if _m2 is None:
        logger.info("Loading M2 Embedding...")
        from sentence_transformers import SentenceTransformer
        _m2 = SentenceTransformer(str(M2_DIR))
        logger.info("M2 ready!")
    return _m2

def get_m3():
    global _m3, _m3_keys
    if _m3 is None:
        logger.info("Loading M3 XGBoost...")
        with open(M3_PKL, "rb") as f:
            data = pickle.load(f)
        _m3 = data["model"]
        _m3_keys = data["feature_keys"]
        logger.info("M3 ready!")
    return _m3, _m3_keys

app = FastAPI(title="CareerFit ML API", version="1.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_methods=["*"], allow_headers=["*"])

def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception:
        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as e2:
            raise HTTPException(status_code=400, detail=str(e2))

def extract_exp_years(text: str) -> int:
    for pat in [r"(\d+)\s*(?:nam|year|yr)s?\s*(?:kinh|exp)",
                r"(?:kinh|exp)\S*\s*(\d+)\s*(?:nam|year)"]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return 1

def extract_exp_from_jd(text: str):
    m = re.search(r"(\d+)\s*[-]\s*(\d+)\s*(?:nam|year)", text, re.IGNORECASE)
    if m: return int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d+)\s*nam\s*tro\s*len", text, re.IGNORECASE)
    if m: y = int(m.group(1)); return y, y + 5
    m = re.search(r"(?:toi thieu|it nhat|minimum)\s*(\d+)\s*(?:nam|year)", text, re.IGNORECASE)
    if m: y = int(m.group(1)); return y, y + 3
    return 1, 5

def run_ner(text: str) -> dict:
    ner = get_m1()
    chunks = [text[i:i+400] for i in range(0, min(len(text), 3000), 400)]
    skills, exps, edus, orgs = [], [], [], []
    for chunk in chunks:
        if not chunk.strip(): continue
        try:
            for e in ner(chunk):
                word = e["word"].replace("@@", "").strip()
                if len(word) < 2: continue
                eg = e["entity_group"]
                if eg == "SKILL": skills.append(word)
                elif eg == "EXP": exps.append(word)
                elif eg == "EDU": edus.append(word)
                elif eg == "ORG": orgs.append(word)
        except Exception: pass
    return {"skills": list(set(skills)), "experiences": list(set(exps)),
            "educations": list(set(edus)), "organizations": list(set(orgs))}

@app.post("/api/analyze")
async def analyze(
    cv_file: Optional[UploadFile] = File(None),
    cv_text: Optional[str] = Form(None),
    jd_text: str = Form(...),
    job_title: str = Form(""),
):
    logger.info("Analyze request received")
    if cv_file and cv_file.filename:
        raw_cv = extract_pdf_text(await cv_file.read())
    elif cv_text and cv_text.strip():
        raw_cv = cv_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Can cung cap CV")

    cv_ents = run_ner(raw_cv)
    jd_ents = run_ner(jd_text)

    m2 = get_m2()
    from sentence_transformers.util import cos_sim
    cv_txt = " ".join(cv_ents["skills"])[:400] or raw_cv[:200]
    cv_emb = m2.encode(cv_txt)
    jd_emb = m2.encode(jd_text[:400])
    similarity = float(cos_sim(cv_emb, jd_emb).item())

    cv_set = set(s.lower() for s in cv_ents["skills"])
    jd_set = set(s.lower() for s in jd_ents["skills"])
    overlap = len(cv_set & jd_set)
    skill_ratio = overlap / max(len(jd_set), 1)
    cv_exp = extract_exp_years(raw_cv)
    jd_min, jd_max = extract_exp_from_jd(jd_text)
    exp_ok = jd_min <= cv_exp <= jd_max + 2
    exp_gap = max(0, jd_min - cv_exp)

    features = {
        "skill_overlap_count": overlap, "skill_ratio": skill_ratio,
        "jd_skill_count": len(jd_set), "cv_skill_count": len(cv_set),
        "cv_exp_years": cv_exp, "jd_exp_min": jd_min, "jd_exp_max": jd_max,
        "exp_ok": int(exp_ok), "exp_gap": exp_gap,
        "exp_ratio": min(cv_exp / max(jd_min, 1), 2.0), "m2_similarity": similarity
    }

    m3, m3_keys = get_m3()
    x = np.array([[features[k] for k in m3_keys]])
    final_score = float(min(100, max(0, m3.predict(x)[0] + similarity * 10)))

    matched = list(cv_set & jd_set)
    missing = list(jd_set - cv_set)

    strengths = []
    if matched:
        strengths.append({"title": "Ky nang phu hop - " + str(len(matched)) + " ky nang",
            "desc": "Co: " + ", ".join(matched[:5])})
    if exp_ok:
        strengths.append({"title": "Kinh nghiem phu hop - " + str(cv_exp) + " nam",
            "desc": "JD yeu cau " + str(jd_min) + " den " + str(jd_max) + " nam"})
    if cv_ents["educations"]:
        strengths.append({"title": "Hoc van xac nhan",
            "desc": ", ".join(cv_ents["educations"][:2])})
    if similarity > 0.5:
        strengths.append({"title": "Do tuong dong ngu nghia cao",
            "desc": "M2 Similarity = " + str(round(similarity, 2))})

    gaps = []
    if missing:
        gaps.append({"title": "Thieu " + str(len(missing)) + " ky nang",
            "desc": "JD can: " + ", ".join(missing[:5])})
    if not exp_ok and exp_gap > 0:
        gaps.append({"title": "Thieu " + str(exp_gap) + " nam kinh nghiem",
            "desc": "JD can " + str(jd_min) + " nam, CV co " + str(cv_exp) + " nam"})
    if similarity < 0.4:
        gaps.append({"title": "Do tuong dong ngu nghia thap",
            "desc": "M2 Sim = " + str(round(similarity, 2))})

    questions = []
    if missing:
        sk = missing[0]
        questions.append({"id": "01", "category": "Xac thuc ky nang con thieu",
            "categoryColor": "bg-[#dce1ff] text-[#001551]", "badgeBg": "bg-[#1d4ed8]",
            "duration": "10 phut", "weight": "30%", "weightColor": "text-[#0037b0]",
            "question": "Ban co kinh nghiem voi " + sk + " khong? Mo ta du an cu the.",
            "expected": ["Du an thuc te voi " + sk, "Ket qua dat duoc"],
            "redFlags": ["Chua dung " + sk + " trong thuc te"]})
    if matched:
        sk2 = matched[0]
        questions.append({"id": "02", "category": "Xac thuc ky nang noi bat",
            "categoryColor": "bg-[#d1fae5] text-[#065f46]", "badgeBg": "bg-[#059669]",
            "duration": "20 phut", "weight": "40%", "weightColor": "text-[#065f46]",
            "question": "Dung " + sk2 + " trong du an nao kho nhat?",
            "expected": ["Kinh nghiem thuc chien voi " + sk2, "Best practices"],
            "redFlags": ["Chi dung " + sk2 + " o muc tutorial"]})

    return {
        "score": round(final_score, 1), "similarity": round(similarity, 3),
        "cv_entities": cv_ents, "jd_entities": jd_ents, "features": features,
        "strengths": strengths or [{"title": "Dang phan tich", "desc": "Khong tim thay diem manh."}],
        "gaps": gaps or [{"title": "Khong co khoang trong lon", "desc": "CV phu hop JD."}],
        "questions": questions[:3], "job_title": job_title,
        "cv_exp_years": cv_exp, "skill_overlap": overlap,
        "matched_skills": matched, "missing_skills": missing[:5]
    }

@app.get("/health")
def health():
    return {"status": "ok", "m1": M1_DIR.exists(), "m2": M2_DIR.exists(), "m3": M3_PKL.exists()}

@app.get("/")
def root():
    return {"message": "CareerFit ML API - POST /api/analyze"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)