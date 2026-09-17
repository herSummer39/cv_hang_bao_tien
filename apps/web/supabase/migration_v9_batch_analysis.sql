-- ============================================================
-- CareerFit — Migration v9: So sánh & xếp hạng nhiều CV cho 1 JD
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Nhiều CV cùng nộp 1 lượt (nhà tuyển dụng) được gắn chung batch_id để
-- trang /batch/[batchId] poll và xếp hạng cùng nhau. worker.py không cần
-- đổi gì — vẫn xử lý từng job như cũ, không quan tâm cột này.
alter table public.analysis_jobs
  add column if not exists batch_id uuid;

create index if not exists idx_analysis_jobs_batch_id
  on public.analysis_jobs(batch_id);

-- Kiểm tra
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'analysis_jobs'
  and column_name = 'batch_id';
