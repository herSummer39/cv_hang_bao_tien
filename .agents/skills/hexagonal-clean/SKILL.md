---
name: hexagonal-clean
description: >
  Áp dụng kiến trúc lục giác (Hexagonal / Ports & Adapters) kết hợp nguyên lý Clean Code
  cho mọi module trong dự án CareerFit. Kích hoạt khi user đề cập "hexagonal", "lục giác",
  "clean code", "ports and adapters", "tách layer", "domain logic", hoặc khi thiết kế module mới.
---

# Skill: Hexagonal Architecture + Clean Code

## Tổng quan

Kiến trúc lục giác (Hexagonal / Ports & Adapters — Alistair Cockburn, 2005) tách biệt
**domain logic** khỏi mọi chi tiết hạ tầng (database, HTTP, UI, AI model).
Kết hợp với Clean Code giúp codebase dễ test, dễ thay thế adapter, dễ đọc.

---

## Cấu trúc thư mục chuẩn (Next.js Monorepo)

```
packages/ml-service/
├── src/
│   ├── domain/               ← Tầng Domain (không phụ thuộc gì)
│   │   ├── entities/         ← CvEntity, JdEntity, ScoreEntity
│   │   ├── value_objects/    ← SkillSet, ExperienceGap, ScoreResult
│   │   └── ports/            ← Interface (Port) - hướng vào & ra
│   │       ├── inbound/      ← IScoreUseCase, IAdviseUseCase, IInterviewUseCase
│   │       └── outbound/     ← ICvParser, INerModel, IRetriever, IXgbScorer
│   │
│   ├── application/          ← Use Cases (orchestrate domain + ports)
│   │   ├── score_cv.py       ← ScoreCvUseCase
│   │   ├── advise_cv.py      ← AdviseCvUseCase
│   │   └── run_interview.py  ← RunInterviewUseCase
│   │
│   ├── adapters/             ← Tầng Adapter (implements ports)
│   │   ├── inbound/
│   │   │   └── fastapi_router.py   ← HTTP → UseCase
│   │   └── outbound/
│   │       ├── pdfplumber_parser.py
│   │       ├── phobert_ner.py      ← implements INerModel
│   │       ├── bkai_retriever.py   ← implements IRetriever
│   │       ├── xgb_scorer.py       ← implements IXgbScorer
│   │       ├── qwen_generator.py   ← implements IGenerator
│   │       └── supabase_repo.py    ← implements IResultRepo
│   │
│   ├── infrastructure/       ← Config, DI container, startup
│   │   ├── container.py      ← Dependency Injection (wire ports → adapters)
│   │   └── settings.py       ← Pydantic Settings (env vars)
│   │
│   └── main.py               ← FastAPI app + lifespan

apps/web/src/
├── domain/                   ← TypeScript domain types
│   └── types.ts              ← ScoreResult, Advice, InterviewSession
├── application/              ← Client-side use cases (hooks)
│   ├── useScoreCv.ts
│   ├── useAdvise.ts
│   └── useInterview.ts
├── adapters/
│   └── api/                  ← Fetch wrappers (Vercel route → HF Space)
│       ├── scoreApi.ts
│       ├── adviseApi.ts
│       └── interviewApi.ts
└── ui/                       ← React components (pure presentation)
    ├── pages/
    └── components/
```

---

## Quy tắc bất biến (KHÔNG được vi phạm)

### 1. Dependency Rule
```
Domain ← Application ← Adapters ← Infrastructure
```
- `domain/` KHÔNG được import từ `adapters/` hoặc `infrastructure/`
- `application/` KHÔNG được import trực tiếp từ adapter cụ thể — chỉ qua Port interface

### 2. Port là Interface thuần túy
```python
# ✅ ĐÚNG — Port trong domain/ports/outbound/
from abc import ABC, abstractmethod
from domain.value_objects import CvText, NerResult

class INerModel(ABC):
    @abstractmethod
    def extract(self, cv_text: CvText) -> NerResult:
        ...

# ✅ ĐÚNG — Adapter implements port
class PhoBertNer(INerModel):
    def extract(self, cv_text: CvText) -> NerResult:
        # PhoBERT logic here
        ...

# ❌ SAI — UseCase import trực tiếp PhoBertNer
from adapters.outbound.phobert_ner import PhoBertNer  # Vi phạm!
```

### 3. Use Case chỉ nhận Port qua Constructor Injection
```python
# ✅ ĐÚNG
class ScoreCvUseCase:
    def __init__(
        self,
        ner: INerModel,
        retriever: IRetriever,
        scorer: IXgbScorer,
        repo: IResultRepo,
    ):
        self._ner = ner
        self._retriever = retriever
        self._scorer = scorer
        self._repo = repo

    async def execute(self, cv_text: str, jd_text: str) -> ScoreResult:
        ...
```

### 4. Entity và Value Object là immutable
```python
# ✅ ĐÚNG — Value Object bất biến
from dataclasses import dataclass

@dataclass(frozen=True)
class SkillSet:
    skills: tuple[str, ...]  # tuple, không phải list

    def overlap_ratio(self, other: "SkillSet") -> float:
        return len(set(self.skills) & set(other.skills)) / max(len(self.skills), 1)
```

### 5. Không có logic nghiệp vụ trong Adapter
```python
# ❌ SAI — Tính điểm trong adapter
class XgbScorer(IXgbScorer):
    def score(self, features):
        result = self.model.predict(features)
        if result > 80:  # Logic nghiệp vụ ở đây là SAI
            return "Xuất sắc"

# ✅ ĐÚNG — Adapter chỉ chuyển đổi dữ liệu
class XgbScorer(IXgbScorer):
    def score(self, features: FeatureVector) -> RawScore:
        return RawScore(value=float(self.model.predict([features.to_array()])[0]))
```

---

## Clean Code Checklist

### Đặt tên
- Hàm: **động từ + danh từ** → `extract_entities()`, `compute_overlap()`, `retrieve_chunks()`
- Class: **danh từ** → `ScoreCvUseCase`, `PhoBertNer`, `SkillSet`
- Biến boolean: **is_/has_/can_** → `is_valid_pdf`, `has_experience_gap`
- Hằng số: **UPPER_SNAKE_CASE** → `MAX_CHUNK_SIZE = 512`

### Hàm
- Mỗi hàm chỉ làm **1 việc** (Single Responsibility)
- Tối đa **3 tham số** — nếu hơn, tạo dataclass
- Không có side effect ẩn
- Docstring bằng tiếng Anh (Google style)

### Comment
- Comment giải thích **TẠI SAO**, không phải **LÀM GÌ**
- Không comment code chết → xóa đi
- TODO phải có tên người và deadline: `# TODO(hung): refactor sau D10 - 2026-09-30`

### Error Handling
```python
# ✅ ĐÚNG — Custom exceptions từ domain
class CvParseError(DomainError): ...
class InsufficientSkillsError(DomainError): ...

# ✅ ĐÚNG — Raise ở đúng layer
class PdfPlumberParser(ICvParser):
    def parse(self, pdf_bytes: bytes) -> CvText:
        if not self._has_text_layer(pdf_bytes):
            raise CvParseError("CV là file scan, không có text layer")
```

---

## Dependency Injection Container
```python
# infrastructure/container.py
from adapters.outbound.phobert_ner import PhoBertNer
from adapters.outbound.xgb_scorer import XgbScorer
from application.score_cv import ScoreCvUseCase

def build_container(settings: Settings) -> dict:
    ner = PhoBertNer(model_path=settings.NER_MODEL_PATH)
    scorer = XgbScorer(model_path=settings.XGB_MODEL_PATH)
    retriever = BkaiRetriever(supabase_url=settings.SUPABASE_URL)
    repo = SupabaseRepo(service_key=settings.SUPABASE_SERVICE_KEY)

    return {
        "score_use_case": ScoreCvUseCase(ner, retriever, scorer, repo),
    }
```

---

## Testing Strategy (theo từng tầng)

| Tầng | Test type | Mock gì |
|---|---|---|
| Domain (Entity/VO) | Unit test | Không mock gì |
| Application (UseCase) | Unit test | Mock tất cả Ports |
| Adapter (outbound) | Integration test | Mock external service |
| E2E | FastAPI TestClient | Không mock |

```python
# Ví dụ: Test UseCase với mock port
def test_score_cv_returns_valid_result():
    mock_ner = Mock(spec=INerModel)
    mock_ner.extract.return_value = NerResult(skills=("python", "sql"))
    mock_scorer = Mock(spec=IXgbScorer)
    mock_scorer.score.return_value = RawScore(value=75.0)

    use_case = ScoreCvUseCase(ner=mock_ner, retriever=..., scorer=mock_scorer, repo=...)
    result = use_case.execute("cv text", "jd text")

    assert 0 <= result.score <= 100
```

---

## References

- [Hexagonal Architecture — Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Code — Robert C. Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Architecture Patterns with Python — Harry Percival](https://www.cosmicpython.com/)
