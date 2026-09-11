"""
train_m3_xgboost.py
Train M3: XGBoost Scorer — tính điểm 0-100 cho cặp (CV, JD)
Features từ M1 NER + M2 Embedding + rule-based

Chạy sau khi M1 và M2 đã train xong.
"""
import os
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import json
import logging
import pickle
import random
import numpy as np
from pathlib import Path

import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
logger = logging.getLogger(__name__)

random.seed(42)
np.random.seed(42)

M2_DIR   = Path(__file__).parent.parent / "models" / "m2_embedding_full" / "final"
M3_DIR   = Path(__file__).parent.parent / "models" / "m3_xgboost"
DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
M3_DIR.mkdir(parents=True, exist_ok=True)


# ─── Tạo synthetic scored pairs ──────────────────────────────────────────────
SKILL_GROUPS = {
    "frontend": ["React", "Vue", "Angular", "TypeScript", "CSS", "Next.js"],
    "backend":  ["Python", "Node.js", "Java", "FastAPI", "Django", "Spring Boot"],
    "data":     ["SQL", "Pandas", "Spark", "MongoDB", "Redis", "PostgreSQL"],
    "devops":   ["Docker", "Kubernetes", "AWS", "GCP", "Linux", "CI/CD"],
    "ai":       ["TensorFlow", "PyTorch", "XGBoost", "Scikit-learn", "PhoBERT"],
    "marketing":["SEO", "Google Ads", "Facebook Ads", "Content Marketing", "CRM"],
    "hr":       ["Tuyển dụng", "C&B", "HRIS", "Onboarding", "KPI"],
    "design":   ["Figma", "Photoshop", "Illustrator", "UI/UX", "Adobe XD"],
    "sales":    ["B2B Sales", "Đàm phán", "CRM", "Quản lý kênh", "KPI doanh số"],
    "accounting":["MISA", "SAP", "Kế toán tổng hợp", "Báo cáo tài chính", "Excel"],
}


def compute_features(cv_skills: list, jd_skills: list, cv_exp: int, jd_exp_min: int,
                     jd_exp_max: int, similarity: float) -> dict:
    """Tính feature vector từ CV và JD."""
    # Kỹ năng overlap
    cv_set = set(s.lower() for s in cv_skills)
    jd_set = set(s.lower() for s in jd_skills)
    overlap = len(cv_set & jd_set)
    skill_ratio = overlap / max(len(jd_set), 1)

    # Kinh nghiệm
    exp_ok = jd_exp_min <= cv_exp <= jd_exp_max + 2
    exp_gap = max(0, jd_exp_min - cv_exp)  # thiếu bao nhiêu năm
    exp_ratio = min(cv_exp / max(jd_exp_min, 1), 2.0)

    return {
        "skill_overlap_count": overlap,
        "skill_ratio": skill_ratio,
        "jd_skill_count": len(jd_set),
        "cv_skill_count": len(cv_set),
        "cv_exp_years": cv_exp,
        "jd_exp_min": jd_exp_min,
        "jd_exp_max": jd_exp_max,
        "exp_ok": int(exp_ok),
        "exp_gap": exp_gap,
        "exp_ratio": min(exp_ratio, 2.0),
        "m2_similarity": similarity,
    }


def compute_score(features: dict) -> float:
    """Tính điểm tham chiếu (ground truth) để train."""
    score = 0.0
    # Kỹ năng: 40 điểm
    score += features["skill_ratio"] * 40

    # Kinh nghiệm: 30 điểm
    if features["exp_ok"]:
        score += 30 - features["exp_gap"] * 5
    else:
        score += max(0, 15 - features["exp_gap"] * 8)

    # Semantic similarity: 30 điểm
    score += max(0, features["m2_similarity"]) * 30

    # Clamp
    return min(max(score, 0.0), 100.0)


def generate_scored_pairs(n: int = 2000) -> list[dict]:
    """Sinh dữ liệu (CV, JD, score) có nhãn."""
    pairs = []
    groups = list(SKILL_GROUPS.keys())

    for _ in range(n):
        # Chọn ngành (cùng ngành hoặc khác ngành)
        same_group = random.random() > 0.4  # 60% cùng ngành
        g1 = random.choice(groups)
        g2 = g1 if same_group else random.choice([g for g in groups if g != g1])

        cv_skills = random.sample(SKILL_GROUPS[g1], k=random.randint(2, 5))
        jd_skills = random.sample(SKILL_GROUPS[g2], k=random.randint(2, 4))

        cv_exp = random.randint(0, 10)
        jd_exp_min = random.randint(0, 5)
        jd_exp_max = jd_exp_min + random.randint(2, 5)

        # Similarity: cùng ngành thì cao hơn
        if same_group:
            base_sim = random.uniform(0.4, 0.9)
        else:
            base_sim = random.uniform(-0.1, 0.4)

        features = compute_features(cv_skills, jd_skills, cv_exp, jd_exp_min, jd_exp_max, base_sim)
        score = compute_score(features)

        # Thêm noise nhỏ
        score = min(max(score + random.gauss(0, 3), 0), 100)

        pairs.append({
            "features": features,
            "score": round(score, 2),
            "cv_skills": cv_skills,
            "jd_skills": jd_skills,
            "same_group": same_group,
        })

    return pairs


def train_xgboost(pairs: list[dict]):
    """Train XGBoost regressor."""
    feature_keys = [
        "skill_overlap_count", "skill_ratio", "jd_skill_count", "cv_skill_count",
        "cv_exp_years", "jd_exp_min", "jd_exp_max", "exp_ok", "exp_gap",
        "exp_ratio", "m2_similarity",
    ]

    X = np.array([[p["features"][k] for k in feature_keys] for p in pairs])
    y = np.array([p["score"] for p in pairs])

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    logger.info(f"Train: {len(X_train)} | Val: {len(X_val)}")

    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    preds = model.predict(X_val)
    mae = mean_absolute_error(y_val, preds)
    r2  = r2_score(y_val, preds)

    logger.info(f"\nKết quả:")
    logger.info(f"  MAE: {mae:.2f} điểm  (sai lệch trung bình)")
    logger.info(f"  R²:  {r2:.4f}        (1.0 = hoàn hảo)")

    # Feature importance
    importance = dict(zip(feature_keys, model.feature_importances_))
    importance_sorted = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    logger.info("\nFeature importance:")
    for feat, imp in importance_sorted[:6]:
        logger.info(f"  {feat:30s} {imp:.4f}")

    return model, feature_keys, {"mae": mae, "r2": r2}


if __name__ == "__main__":
    logger.info("Sinh dữ liệu scored pairs...")
    pairs = generate_scored_pairs(n=3000)

    # Save raw data
    raw_path = DATA_DIR / "scored_pairs.json"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(
        json.dumps(pairs[:100], ensure_ascii=False, indent=2),  # preview 100
        encoding="utf-8"
    )
    logger.info(f"[SAVED preview] {raw_path}")

    logger.info(f"\nSample scores: {[round(p['score'],1) for p in pairs[:10]]}")

    logger.info("\nBắt đầu train M3 XGBoost...")
    model, feature_keys, metrics = train_xgboost(pairs)

    # Save model
    model_path = M3_DIR / "xgboost_scorer.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "feature_keys": feature_keys, "metrics": metrics}, f)
    logger.info(f"\n[SAVED] {model_path}")

    # Also save as XGBoost native format
    model.save_model(str(M3_DIR / "xgboost_scorer.json"))
    logger.info(f"[SAVED] {M3_DIR / 'xgboost_scorer.json'}")

    # Quick test
    logger.info("\n--- KIỂM TRA NHANH ---")
    test_cases = [
        {"cv_skills": ["React","TypeScript","Node.js"], "jd_skills": ["React","TypeScript","AWS"],
         "cv_exp": 3, "jd_exp_min": 2, "jd_exp_max": 4, "sim": 0.85, "note": "Match tốt"},
        {"cv_skills": ["React","TypeScript"], "jd_skills": ["React","TypeScript","AWS"],
         "cv_exp": 0, "jd_exp_min": 2, "jd_exp_max": 4, "sim": 0.72, "note": "Thiếu KN"},
        {"cv_skills": ["MISA","Excel","Kế toán tổng hợp"], "jd_skills": ["React","TypeScript"],
         "cv_exp": 3, "jd_exp_min": 2, "jd_exp_max": 4, "sim": 0.05, "note": "Sai ngành"},
    ]
    for tc in test_cases:
        feats = compute_features(
            tc["cv_skills"], tc["jd_skills"],
            tc["cv_exp"], tc["jd_exp_min"], tc["jd_exp_max"], tc["sim"]
        )
        x = np.array([[feats[k] for k in feature_keys]])
        pred = model.predict(x)[0]
        logger.info(f"  [{tc['note']}] Score = {pred:.1f}/100")
