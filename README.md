# CareerFit 🎯

**AI đánh giá CV ↔ JD thông minh bằng tiếng Việt**

> Phân tích độ phù hợp giữa CV và vị trí tuyển dụng, tư vấn cải thiện, và luyện phỏng vấn giả lập — tất cả bằng tiếng Việt.

---

## 🧑‍💻 Thành viên nhóm — Đọc trước khi bắt đầu

> Mỗi thành viên cần làm **một lần duy nhất** khi clone repo về lần đầu.

---

## 📋 Yêu cầu cài đặt

| Công cụ | Phiên bản | Link tải |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| Git | Mới nhất | https://git-scm.com |
| VS Code | Mới nhất | https://code.visualstudio.com |
| Python | 3.10+ | https://python.org (cho ML service) |

---

## 🚀 Setup lần đầu (làm 1 lần)

### Bước 1 — Clone repo

```bash
git clone https://github.com/herSummer39/cv_hang_bao_tien.git
cd cv_hang_bao_tien
```

---

### Bước 2 — Tạo file môi trường

Tạo file `apps/web/.env.local` (xin 2 keys từ trưởng nhóm qua Zalo):

```bash
# Windows — PowerShell
New-Item -Path "apps\web\.env.local" -ItemType File

# Hoặc tạo tay bằng VS Code: tạo file apps/web/.env.local
```

Nội dung file `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<xin từ trưởng nhóm>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<xin từ trưởng nhóm>
```

> ⚠️ File này đã có trong `.gitignore` — **KHÔNG được commit lên GitHub!**

---

### Bước 3 — Cài dependencies web app

```bash
cd apps/web
npm install
```

---

### Bước 4 — Cài dependencies ML service (nếu làm phần AI)

```bash
cd packages/ml-service
pip install -r requirements.txt
```

---

### Bước 5 — Chạy app

```bash
# Từ thư mục apps/web
npm run dev
```

Mở trình duyệt: **http://localhost:3000** ✅

---

## 📅 Làm việc hằng ngày

### Mỗi buổi sáng — kéo code mới nhất về

```bash
# Từ thư mục gốc cv_hang_bao_tien/
git pull origin master
```

---

### Khi viết code xong — commit và push

```bash
# Bước 1: Xem có gì thay đổi
git status

# Bước 2: Thêm file vào staging
git add .
# Hoặc thêm file cụ thể:
git add apps/web/src/app/score/page.tsx

# Bước 3: Commit với mô tả rõ ràng
git commit -m "feat: add score result page"

# Bước 4: Push lên GitHub
git push origin master
```

---

### Quy tắc đặt tên commit

```
feat: thêm tính năng mới
fix:  sửa bug
ui:   thay đổi giao diện
db:   thay đổi database
ml:   thay đổi AI/model
docs: cập nhật tài liệu
```

Ví dụ:
```bash
git commit -m "feat: add interview simulation page"
git commit -m "fix: fix login redirect bug"
git commit -m "ui: update dashboard card design"
git commit -m "db: add feedback table migration"
```

---

## 🗄️ Thay đổi database (Supabase)

### Khi bạn cần thêm bảng / cột mới:

**Bước 1:** Tạo file SQL mới trong `apps/web/supabase/`

```bash
# Đặt tên rõ ràng theo nội dung
# Ví dụ: apps/web/supabase/migration_v2_add_feedback.sql
```

**Bước 2:** Viết SQL vào file đó

```sql
-- apps/web/supabase/migration_v2_add_feedback.sql
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id),
  message    text not null,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

create policy "User gửi feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);
```

**Bước 3:** Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn project **cv_hang_bao_tien** → **SQL Editor** → paste SQL → nhấn **Run**

**Bước 4:** Commit file SQL lên GitHub để team biết

```bash
git add apps/web/supabase/migration_v2_add_feedback.sql
git commit -m "db: add feedback table"
git push origin master
```

**Bước 5 (team):** Khi thành viên khác pull code về thấy file migration mới → vào Supabase Dashboard chạy SQL đó

---

## 📁 Cấu trúc project

```
cv_hang_bao_tien/
│
├── apps/
│   └── web/                    ← Next.js web app
│       ├── src/
│       │   ├── app/            ← Các trang (routing)
│       │   │   ├── page.tsx        Landing page
│       │   │   ├── login/          Trang đăng nhập
│       │   │   ├── register/       Trang đăng ký
│       │   │   ├── dashboard/      Trang tổng quan
│       │   │   ├── score/          Trang đánh giá CV
│       │   │   └── auth/           Auth callbacks
│       │   ├── components/     ← Component dùng chung
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── AuthNav.tsx
│       │   └── lib/
│       │       └── supabase/   ← Supabase client & types
│       ├── supabase/           ← SQL migration files
│       └── .env.local          ← ⚠️ Không commit!
│
├── packages/
│   └── ml-service/             ← FastAPI AI backend
│       ├── scripts/            ← Training scripts
│       │   ├── generate_training_data.py
│       │   └── train_m2_embedding.py
│       ├── src/adapters/       ← CV parser
│       ├── models/             ← Trained models (không commit)
│       └── data/               ← Training data
│
├── TEAM_SETUP.md               ← Hướng dẫn chi tiết
└── README.md                   ← File này
```

---

## 🔧 Tech stack

| Phần | Công nghệ |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Storage | Supabase Storage (lưu file CV) |
| AI/ML | Python, PhoBERT, XGBoost, sentence-transformers |
| Deploy web | Vercel (tự động khi push) |
| AI/ML service | Chạy local (`worker.py` poll Supabase) — model được đồng bộ giữa các thành viên qua DVC + Google Drive, chưa deploy lên server public |

---

## 🤖 Phần AI/ML (cho thành viên làm model)

### Sinh data training

```bash
cd packages/ml-service
python scripts/generate_training_data.py
```

### Train M2 Embedding model (test nhanh CPU)

```bash
python scripts/train_m2_embedding.py --mode dev
```

### Train M2 đầy đủ

```bash
python scripts/train_m2_embedding.py --mode full
```

### Test CV parser

```bash
python test_parser.py
```

---

## ❓ Lỗi thường gặp

### `Module not found` sau khi pull code mới

```bash
cd apps/web
npm install
```

### App không kết nối được Supabase

Kiểm tra file `.env.local` có đúng 2 keys chưa.

### `git push` bị từ chối (rejected)

```bash
git pull origin master   # Kéo code mới nhất về trước
# Giải quyết conflict nếu có
git push origin master   # Push lại
```

### Conflict khi pull

```bash
git pull origin master
# VS Code sẽ highlight các dòng conflict
# Chọn "Accept Current" hoặc "Accept Incoming" tùy từng trường hợp
git add .
git commit -m "fix: resolve merge conflict"
git push
```

---

## 📞 Liên hệ

| Vai trò | Tên |
|---|---|
| Trưởng nhóm (keys Supabase) | Hằng Bảo Tiên |
| GitHub repo | https://github.com/herSummer39/cv_hang_bao_tien |
| Supabase project | https://supabase.com/dashboard/project/ctyyzthdszxjdkkzuxbi |
