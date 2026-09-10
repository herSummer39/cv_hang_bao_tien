# CareerFit — Hướng dẫn setup cho team

## 1. Clone repo về

```bash
git clone https://github.com/herSummer39/cv_hang_bao_tien.git
cd cv_hang_bao_tien
```

---

## 2. Tạo file `.env.local`

Vào thư mục `apps/web/` và tạo file `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ctyyzthdszxjdkkzuxbi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Xin keys này từ trưởng nhóm qua Zalo/Discord. KHÔNG commit file này.

---

## 3. Cài dependencies và chạy

```bash
cd apps/web
npm install
npm run dev
```

Mở http://localhost:3000 để xem app.

---

## 4. Khi cần thay đổi database (Supabase)

### Cách 1 — Đơn giản (dùng chung 1 Supabase project)

Khi bạn cần thêm bảng, cột mới:

1. Viết SQL vào file mới trong `apps/web/supabase/`:
   ```
   apps/web/supabase/migration_v2_them_bang_moi.sql
   ```

2. Vào [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**

3. Paste SQL vào và **Run**

4. Commit file SQL lên GitHub:
   ```bash
   git add apps/web/supabase/migration_v2_them_bang_moi.sql
   git commit -m "db: add new table for ..."
   git push
   ```

---

### Cách 2 — Chuẩn dùng Supabase CLI

#### Cài Supabase CLI

```bash
npm install -g supabase
```

#### Đăng nhập

```bash
supabase login
# Mở browser → đăng nhập → lấy token tự động
```

#### Link với project của team

```bash
cd apps/web
supabase link --project-ref ctyyzthdszxjdkkzuxbi
# Nhập database password khi được hỏi (xin từ trưởng nhóm)
```

#### Tạo migration mới

```bash
supabase migration new them_bang_feedback
# → Tạo file: supabase/migrations/20250910_them_bang_feedback.sql
```

#### Viết SQL vào file migration

```sql
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  message text,
  created_at timestamptz default now()
);
```

#### Push lên Supabase

```bash
supabase db push
```

#### Commit lên GitHub

```bash
git add supabase/migrations/
git commit -m "db: add feedback table"
git push
```

#### Các thành viên khác apply

```bash
git pull
supabase db push
# Tự động apply migration mới, bỏ qua migration đã chạy rồi
```

---

## 5. Quy tắc làm việc nhóm

| Tình huống | Làm gì |
|---|---|
| Thêm tính năng mới (chỉ code) | Push thẳng lên GitHub |
| Thêm/sửa bảng DB | Tạo migration file + push Supabase + commit |
| Sửa code người khác | Pull về trước → sửa → push |

---

## 6. Vercel — tự động deploy

Sau khi push code → Vercel tự build và deploy. Không cần làm gì thêm!

> ⚠️ Nếu thêm biến môi trường mới → vào **Vercel Dashboard → Settings → Environment Variables** thêm thủ công.
