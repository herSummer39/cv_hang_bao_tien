-- ============================================================
-- CareerFit — Migration v14: Lưu lịch sử các lượt "So sánh CV"
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Mỗi lượt so sánh (nhiều CV × 1 JD) = 1 dòng. id CHÍNH LÀ batch_id đã gắn
-- vào analysis_jobs (migration v9) — không đổi gì ở worker.py.
create table if not exists public.batches (
  id           uuid        primary key,
  user_id      uuid        references auth.users(id) on delete set null,
  name         text,
  job_title    text,
  jd_text      text,
  industry_id  uuid        references public.industries(id) on delete set null,
  cv_count     int         not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.batches enable row level security;

-- Mở đọc/ghi giống analysis_jobs (trang /batch/[id] đọc được cả khi chưa đăng
-- nhập); chỉ chủ lượt so sánh mới xoá được lượt của mình.
drop policy if exists "Ai cung tao duoc batch" on public.batches;
create policy "Ai cung tao duoc batch"
  on public.batches for insert with check (true);

drop policy if exists "Ai cung doc duoc batch" on public.batches;
create policy "Ai cung doc duoc batch"
  on public.batches for select using (true);

drop policy if exists "Chu batch xoa duoc batch" on public.batches;
create policy "Chu batch xoa duoc batch"
  on public.batches for delete using (auth.uid() = user_id);

create index if not exists idx_batches_user
  on public.batches(user_id, created_at desc);

-- Khôi phục các lượt so sánh ĐÃ CÓ trước đây (trước migration này chỉ nằm rải
-- rác trong analysis_jobs.batch_id) để chúng hiện luôn trong Dashboard.
insert into public.batches (id, user_id, job_title, jd_text, cv_count, created_at)
select
  batch_id,
  (array_agg(user_id) filter (where user_id is not null))[1],
  max(job_title),
  max(jd_text),
  count(*),
  min(created_at)
from public.analysis_jobs
where batch_id is not null
group by batch_id
on conflict (id) do nothing;

-- Kiểm tra
select count(*) as so_luot_so_sanh from public.batches;
