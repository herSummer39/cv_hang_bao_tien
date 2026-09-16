-- ============================================================
-- CareerFit — Migration v7: Lưu CV thật vào Storage theo user
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Bucket đang giới hạn 5MB nhưng UI upload đang ghi "tối đa 25MB" — nâng bucket khớp UI
update storage.buckets
set file_size_limit = 26214400  -- 25MB
where id = 'user-cvs';

alter table public.analysis_jobs
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.analysis_jobs
  add column if not exists cv_storage_path text;

create index if not exists idx_analysis_jobs_user_id
  on public.analysis_jobs(user_id, created_at desc);

-- Kiểm tra
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'analysis_jobs'
  and column_name in ('user_id', 'cv_storage_path');
