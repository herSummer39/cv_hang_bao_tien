-- ============================================================
-- CareerFit — Migration v13: Nhận diện giọng nói câu trả lời phỏng vấn
-- chạy trên worker.py (PhoWhisper-small, GPU) thay vì trong trình duyệt
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Bucket tạm chứa file ghi âm câu trả lời (WAV 16kHz mono). Worker tải về,
-- nhận diện xong thì XOÁ ngay — không lưu giữ giọng nói của ứng viên.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-answers',
  'interview-answers',
  false,
  10485760,  -- 10MB (~5 phút WAV 16kHz 16-bit mono), dư cho 3 phút/câu
  array['audio/wav', 'audio/x-wav']
)
on conflict (id) do nothing;

drop policy if exists "Upload ghi am cau tra loi" on storage.objects;
create policy "Upload ghi am cau tra loi"
  on storage.objects for insert
  with check (bucket_id = 'interview-answers');

drop policy if exists "Worker doc ghi am cau tra loi" on storage.objects;
create policy "Worker doc ghi am cau tra loi"
  on storage.objects for select
  using (bucket_id = 'interview-answers');

drop policy if exists "Worker xoa ghi am cau tra loi" on storage.objects;
create policy "Worker xoa ghi am cau tra loi"
  on storage.objects for delete
  using (bucket_id = 'interview-answers');

-- Job queue ASR — cùng mô hình analysis_jobs / interview_audio_jobs
create table if not exists public.interview_asr_jobs (
  id          uuid        primary key default gen_random_uuid(),
  audio_path  text        not null,   -- đường dẫn file trong bucket interview-answers
  status      text        not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'error')),
  transcript  text,
  error_msg   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.interview_asr_jobs enable row level security;

drop policy if exists "Ai cung co the tao asr job" on public.interview_asr_jobs;
create policy "Ai cung co the tao asr job"
  on public.interview_asr_jobs for insert with check (true);

drop policy if exists "Ai cung co the doc asr job" on public.interview_asr_jobs;
create policy "Ai cung co the doc asr job"
  on public.interview_asr_jobs for select using (true);

drop policy if exists "Worker co the cap nhat asr job" on public.interview_asr_jobs;
create policy "Worker co the cap nhat asr job"
  on public.interview_asr_jobs for update using (true);

drop trigger if exists set_interview_asr_jobs_updated_at on public.interview_asr_jobs;
create trigger set_interview_asr_jobs_updated_at
  before update on public.interview_asr_jobs
  for each row execute procedure public.set_updated_at();

create index if not exists idx_interview_asr_jobs_status
  on public.interview_asr_jobs(status, created_at asc);

select 'interview_asr_jobs + bucket interview-answers OK' as status;
