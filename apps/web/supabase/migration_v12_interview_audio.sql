-- ============================================================
-- CareerFit — Migration v12: Đọc câu hỏi phỏng vấn bằng giọng nói
-- (VieNeu-TTS, 7 giọng vùng miền, chạy 100% local qua worker.py — không
-- gọi API ngoài, tận dụng lại đúng bộ giọng đã dùng ở tool video)
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Bucket lưu file audio đã sinh — chỉ là giọng đọc lại chính 5 câu hỏi
-- phỏng vấn (không chứa thông tin cá nhân gì) → để public, FE phát trực
-- tiếp bằng <audio src=publicUrl>, không cần cơ chế signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-audio',
  'interview-audio',
  true,
  5242880,  -- 5MB / file là dư dả (1 câu hỏi đọc ~10-20s, WAV 48kHz mono)
  array['audio/wav', 'audio/x-wav']
)
on conflict (id) do nothing;

drop policy if exists "Ai cung doc duoc audio phong van" on storage.objects;
create policy "Ai cung doc duoc audio phong van"
  on storage.objects for select
  using (bucket_id = 'interview-audio');

drop policy if exists "Worker co the upload audio phong van" on storage.objects;
create policy "Worker co the upload audio phong van"
  on storage.objects for insert
  with check (bucket_id = 'interview-audio');

-- Bảng job queue riêng cho TTS — cùng mô hình với analysis_jobs (FE insert
-- job pending, worker.py (local) poll + xử lý bằng vieneu + cập nhật
-- status/audio_urls).
create table if not exists public.interview_audio_jobs (
  id              uuid        primary key default gen_random_uuid(),
  analysis_job_id uuid        references public.analysis_jobs(id) on delete set null,
  voice           text        not null,               -- mã giọng: Ly/Ngoc/Doan/Binh/Tuyen/Vinh/Son
  questions       jsonb       not null default '[]',   -- danh sách text câu hỏi cần đọc (đúng thứ tự)
  status          text        not null default 'pending'
                    check (status in ('pending', 'processing', 'done', 'error')),
  audio_urls      jsonb,                               -- kết quả: list public URL, đúng thứ tự với questions
  error_msg       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.interview_audio_jobs enable row level security;

-- Mở hoàn toàn (giống analysis_jobs) vì worker dùng anon key, và nội dung
-- job chỉ là text 5 câu hỏi (không có gì riêng tư cần khoá theo user).
create policy "Ai cung co the tao audio job"
  on public.interview_audio_jobs for insert with check (true);

create policy "Ai cung co the doc audio job"
  on public.interview_audio_jobs for select using (true);

create policy "Worker co the cap nhat audio job"
  on public.interview_audio_jobs for update using (true);

drop trigger if exists set_interview_audio_jobs_updated_at on public.interview_audio_jobs;
create trigger set_interview_audio_jobs_updated_at
  before update on public.interview_audio_jobs
  for each row execute procedure public.set_updated_at();

create index if not exists idx_interview_audio_jobs_status
  on public.interview_audio_jobs(status, created_at asc);

-- Kiểm tra
select 'interview_audio_jobs table + interview-audio bucket created OK' as status;
