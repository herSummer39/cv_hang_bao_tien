-- ============================================================
-- CareerFit — Migration v8: Giả lập phỏng vấn thật + lưu lịch sử
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- interview_sessions trước đây được thiết kế quanh cv_sessions (kiến trúc cũ,
-- không còn dùng — luồng hiện tại dùng analysis_jobs). Thêm cột mới, không xoá
-- cột cũ để không phá dữ liệu nào đã có.

alter table public.interview_sessions
  add column if not exists analysis_job_id uuid references public.analysis_jobs(id) on delete set null;

alter table public.interview_sessions
  add column if not exists job_title text;

alter table public.interview_sessions
  add column if not exists candidate_name text;

-- Mỗi phần tử: { question_id, category, question, expected, red_flags,
--                time_limit_sec, time_used_sec, answer_text, question_score, answered_at }
alter table public.interview_sessions
  add column if not exists answers jsonb not null default '[]';

alter table public.interview_sessions
  add column if not exists status text not null default 'completed'
    check (status in ('in_progress', 'completed', 'abandoned'));

alter table public.interview_sessions
  add column if not exists completed_at timestamptz;

-- migration_v1 mới chỉ có policy insert + select, thiếu update (không update thì
-- không thể đánh dấu hoàn tất / lưu điểm ngay trên chính hàng đã tạo)
drop policy if exists "User cap nhat interview cua minh" on public.interview_sessions;
create policy "User cap nhat interview cua minh"
  on public.interview_sessions for update using (auth.uid() = user_id);

create index if not exists idx_interview_sessions_analysis_job
  on public.interview_sessions(analysis_job_id);

-- Kiểm tra
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'interview_sessions'
  and column_name in ('analysis_job_id', 'job_title', 'candidate_name', 'answers', 'status', 'completed_at');
