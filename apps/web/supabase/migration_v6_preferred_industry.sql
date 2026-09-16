-- ============================================================
-- CareerFit — Migration v6: preferred_industry_id cho profiles
-- Chạy nếu cột chưa tồn tại (idempotent).
-- Copy vào Supabase > SQL Editor > Run
-- ============================================================

-- Thêm cột preferred_industry_id vào profiles (nếu chưa có)
alter table public.profiles
  add column if not exists preferred_industry_id uuid
  references public.industries(id) on delete set null;

-- Index để join/lookup nhanh
create index if not exists idx_profiles_preferred_industry
  on public.profiles (preferred_industry_id)
  where preferred_industry_id is not null;

-- Verify
select
  column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'preferred_industry_id';
