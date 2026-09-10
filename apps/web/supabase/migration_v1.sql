-- ============================================================
-- CareerFit — Supabase Migration v1
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================


-- ── 0. Extensions ────────────────────────────────────────────
create extension if not exists "uuid-ossp";
-- pgvector cho JD embedding (cần enable trong Supabase Dashboard trước)
-- Database > Extensions > vector → Enable
create extension if not exists "vector";


-- ══════════════════════════════════════════════════════════════
-- PHẦN 1: TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 1.1 profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free'
                check (plan in ('free', 'pro')),
  cv_count    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 1.2 cv_sessions ──────────────────────────────────────────
create table if not exists public.cv_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,

  -- File CV gốc (lưu trong Storage bucket)
  cv_filename   text not null,
  cv_file_path  text,              -- path trong bucket: {user_id}/{session_id}/cv.pdf
  cv_file_size  int,               -- bytes

  -- JD do user paste
  jd_text       text not null,
  jd_title      text,              -- tên vị trí nếu detect được

  -- Kết quả AI
  score         numeric(5,2),      -- 0.00 – 100.00
  breakdown     jsonb,             -- {skills: 28, experience: 20, education: 13, semantic: 12, bonus: 9}
  gap_analysis  text[],            -- ["Thiếu AWS", "Thiếu CI/CD"]
  suggestions   jsonb,             -- [{field: "skills", tip: "Thêm AWS certification"}]

  -- Text đã parse (để dùng lại cho interview)
  raw_cv_text   text,
  parsed_cv     jsonb,             -- structured JSON từ section parser

  -- Meta
  status        text not null default 'pending'
                  check (status in ('pending', 'processing', 'done', 'error')),
  error_msg     text,
  created_at    timestamptz not null default now()
);

-- ── 1.3 interview_sessions ───────────────────────────────────
create table if not exists public.interview_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cv_session_id   uuid references public.cv_sessions(id) on delete set null,

  questions       jsonb not null default '[]',
  total_score     numeric(5,2),
  summary         text,
  created_at      timestamptz not null default now()
);

-- ── 1.4 jd_library ───────────────────────────────────────────
create table if not exists public.jd_library (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text,
  industry    text,
  location    text,
  salary_min  int,
  salary_max  int,
  jd_text     text not null,
  embedding   vector(768),
  source_url  text,
  source      text default 'vietnamworks',
  is_active   boolean default true,
  created_at  timestamptz not null default now()
);


-- ══════════════════════════════════════════════════════════════
-- PHẦN 2: STORAGE BUCKET
-- ══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-cvs',
  'user-cvs',
  false,
  5242880,                         -- 5MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do nothing;


-- ══════════════════════════════════════════════════════════════
-- PHẦN 3: ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

alter table public.profiles           enable row level security;
alter table public.cv_sessions        enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.jd_library         enable row level security;

-- profiles
create policy "User xem profile của mình"
  on public.profiles for select using (auth.uid() = id);

create policy "User update profile của mình"
  on public.profiles for update using (auth.uid() = id);

-- cv_sessions
create policy "User xem session của mình"
  on public.cv_sessions for select using (auth.uid() = user_id);

create policy "User tạo session mới"
  on public.cv_sessions for insert with check (auth.uid() = user_id);

create policy "User update session của mình"
  on public.cv_sessions for update using (auth.uid() = user_id);

create policy "User xóa session của mình"
  on public.cv_sessions for delete using (auth.uid() = user_id);

-- interview_sessions
create policy "User xem interview của mình"
  on public.interview_sessions for select using (auth.uid() = user_id);

create policy "User tạo interview session"
  on public.interview_sessions for insert with check (auth.uid() = user_id);

-- jd_library: public read
create policy "Tất cả đọc được JD library"
  on public.jd_library for select using (true);

-- Storage: user chỉ access thư mục của mình
create policy "User upload CV của mình"
  on storage.objects for insert
  with check (
    bucket_id = 'user-cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "User xem CV của mình"
  on storage.objects for select
  using (
    bucket_id = 'user-cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "User xóa CV của mình"
  on storage.objects for delete
  using (
    bucket_id = 'user-cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ══════════════════════════════════════════════════════════════
-- PHẦN 4: TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Tự động tạo profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tự động tăng cv_count
create or replace function public.increment_cv_count()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles
  set cv_count = cv_count + 1, updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_cv_session_created on public.cv_sessions;
create trigger on_cv_session_created
  after insert on public.cv_sessions
  for each row execute procedure public.increment_cv_count();

-- Auto updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- PHẦN 5: INDEXES
-- ══════════════════════════════════════════════════════════════

create index if not exists idx_cv_sessions_user_id
  on public.cv_sessions(user_id, created_at desc);

create index if not exists idx_interview_sessions_user_id
  on public.interview_sessions(user_id, created_at desc);

create index if not exists idx_cv_sessions_status
  on public.cv_sessions(status);

create index if not exists idx_jd_library_embedding
  on public.jd_library using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_jd_library_industry
  on public.jd_library(industry);


-- ══════════════════════════════════════════════════════════════
-- KIỂM TRA
-- ══════════════════════════════════════════════════════════════
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','cv_sessions','interview_sessions','jd_library');
