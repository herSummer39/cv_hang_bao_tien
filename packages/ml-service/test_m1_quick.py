import os
from pathlib import Path
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
from transformers import pipeline

MODEL_PATH = Path(__file__).resolve().parent / "models" / "m1_ner" / "final"
ner = pipeline("token-classification", model=str(MODEL_PATH), aggregation_strategy="simple", device=-1)

tests = [
    "Thanh thao React TypeScript Node.js",
    "Co 3 nam kinh nghiem tai FPT Software",
    "Tot nghiep Dai hoc Bach Khoa TPHCM nam 2022",
]
for t in tests:
    r = ner(t)
    entities = [(x["word"], x["entity_group"], round(x["score"], 2)) for x in r]
    print(f"Input: {t}")
    print(f"  -> {entities}")
