-- ============================================================
-- CareerFit — Migration v2: Analysis Jobs Queue
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- Bảng job queue: web gửi job vào đây, worker local xử lý
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_text      TEXT,                       -- CV dạng plain text (nếu user paste)
  cv_b64       TEXT,                       -- CV dạng base64 PDF (nếu user upload file)
  cv_filename  TEXT,                       -- tên file gốc
  jd_text      TEXT        NOT NULL,       -- Job Description
  job_title    TEXT,                       -- tên vị trí
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','done','error')),
  result       JSONB,                      -- kết quả từ worker (score, skills, etc.)
  error_msg    TEXT,                       -- lỗi nếu có
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: cho phép tất cả (kể cả anonymous) để worker dùng anon key
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ai cũng có thể tạo job"
  ON public.analysis_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Ai cũng có thể đọc job"
  ON public.analysis_jobs FOR SELECT USING (true);

CREATE POLICY "Worker có thể cập nhật job"
  ON public.analysis_jobs FOR UPDATE USING (true);

-- Trigger auto updated_at (dùng lại function đã có từ migration_v1)
DROP TRIGGER IF EXISTS set_analysis_jobs_updated_at ON public.analysis_jobs;
CREATE TRIGGER set_analysis_jobs_updated_at
  BEFORE UPDATE ON public.analysis_jobs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Index để worker query nhanh
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status
  ON public.analysis_jobs(status, created_at ASC);

-- Kiểm tra
SELECT 'analysis_jobs table created OK' AS status;
