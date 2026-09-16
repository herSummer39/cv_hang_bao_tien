-- ============================================================
-- CareerFit — Migration v3: Industry Taxonomy (17 nhóm lớn + nhánh nhỏ)
--            + Hard/Soft Skills + Interview Question Bank
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PHẦN 1: TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 3.1 industries (self-referencing: nhóm lớn + nhánh nhỏ) ──
create table if not exists public.industries (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.industries(id) on delete cascade,
  level       text not null check (level in ('group', 'branch')),
  name        text not null,          -- tên hiển thị, vd "Công nghệ thông tin"
  slug        text not null unique,   -- vd "cntt", "cntt-phat-trien-phan-mem"
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  -- nhanh nho (branch) bat buoc phai co parent la 1 nhom (group)
  constraint industries_branch_needs_parent
    check (level = 'group' or parent_id is not null)
);

create index if not exists idx_industries_parent on public.industries(parent_id);

-- ── 3.2 skills (hard skill theo từng ngành, soft skill dùng chung toàn bộ) ──
create table if not exists public.skills (
  id           uuid primary key default gen_random_uuid(),
  industry_id  uuid references public.industries(id) on delete cascade, -- null = soft skill (dùng chung)
  skill_type   text not null check (skill_type in ('hard', 'soft')),
  name         text not null,
  aliases      text[] not null default '{}',  -- các cách viết khác, vd {"ReactJS","React.js","React"}
  created_at   timestamptz not null default now(),

  -- hard skill BAT BUOC gan voi 1 nganh; soft skill thi khong
  constraint skills_hard_needs_industry
    check (skill_type = 'soft' or industry_id is not null)
);

create index if not exists idx_skills_industry on public.skills(industry_id);
create unique index if not exists idx_skills_name_industry
  on public.skills (lower(name), coalesce(industry_id, '00000000-0000-0000-0000-000000000000'));

-- ── 3.3 interview_questions (ngân hàng câu hỏi, chọn theo ngành + loại skill) ──
create table if not exists public.interview_questions (
  id            uuid primary key default gen_random_uuid(),
  industry_id   uuid references public.industries(id) on delete cascade, -- null = câu hỏi chung (behavioral)
  skill_tag     text,               -- tên skill liên quan (match mềm với skills.name, không ép FK cứng)
  question_type text not null check (question_type in ('technical', 'behavioral', 'situational')),
  difficulty    text not null default 'mid' check (difficulty in ('junior', 'mid', 'senior')),
  question      text not null,
  sample_answer text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_interview_questions_industry on public.interview_questions(industry_id);
create index if not exists idx_interview_questions_type on public.interview_questions(question_type, difficulty);


-- ══════════════════════════════════════════════════════════════
-- PHẦN 2: GẮN industry_id VÀO CÁC BẢNG ĐÃ CÓ (v1/v2)
-- ══════════════════════════════════════════════════════════════

alter table public.jd_library    add column if not exists industry_id uuid references public.industries(id);
alter table public.cv_sessions   add column if not exists industry_id uuid references public.industries(id);
alter table public.analysis_jobs add column if not exists industry_id uuid references public.industries(id);

create index if not exists idx_jd_library_industry_id    on public.jd_library(industry_id);
create index if not exists idx_cv_sessions_industry_id   on public.cv_sessions(industry_id);
create index if not exists idx_analysis_jobs_industry_id on public.analysis_jobs(industry_id);


-- ══════════════════════════════════════════════════════════════
-- PHẦN 3: ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

alter table public.industries          enable row level security;
alter table public.skills              enable row level security;
alter table public.interview_questions enable row level security;

create policy "Ai cũng đọc được industries"
  on public.industries for select using (true);

create policy "Ai cũng đọc được skills"
  on public.skills for select using (true);

create policy "Ai cũng đọc được interview_questions"
  on public.interview_questions for select using (true);


-- ══════════════════════════════════════════════════════════════
-- PHẦN 4: SEED 17 NHÓM LỚN (dựa trên số liệu data thật đã phân tích)
-- ══════════════════════════════════════════════════════════════

insert into public.industries (parent_id, level, name, slug, sort_order) values
  (null, 'group', 'Kinh doanh / Bán hàng',                                     'kinh-doanh-ban-hang',       1),
  (null, 'group', 'Marketing / Truyền thông / Quảng cáo',                      'marketing-truyen-thong',    2),
  (null, 'group', 'Công nghệ thông tin',                                       'cntt',                      3),
  (null, 'group', 'Kế toán / Tài chính / Ngân hàng / Bảo hiểm',                'ke-toan-tai-chinh',         4),
  (null, 'group', 'Nhân sự / Hành chính / Pháp lý',                            'nhan-su-hanh-chinh',        5),
  (null, 'group', 'Dịch vụ khách hàng',                                        'dich-vu-khach-hang',        6),
  (null, 'group', 'Thiết kế / Kiến trúc / Nội thất / Mỹ thuật',                'thiet-ke-kien-truc',        7),
  (null, 'group', 'Khách sạn / Nhà hàng / Du lịch / Spa - Làm đẹp',            'khach-san-nha-hang-du-lich',8),
  (null, 'group', 'Y tế / Dược',                                               'y-te-duoc',                 9),
  (null, 'group', 'Xây dựng',                                                  'xay-dung',                  10),
  (null, 'group', 'Điện / Điện tử / Viễn thông',                               'dien-dien-tu-vien-thong',   11),
  (null, 'group', 'Bất động sản',                                              'bat-dong-san',              12),
  (null, 'group', 'Cơ khí / Chế tạo / Tự động hóa / Ô tô',                     'co-khi-che-tao',            13),
  (null, 'group', 'Vận tải / Logistics / Xuất nhập khẩu',                      'van-tai-logistics',         14),
  (null, 'group', 'Sản xuất / Chất lượng (QA-QC) / Công nghiệp chuyên ngành',  'san-xuat-qa-qc',            15),
  (null, 'group', 'Giáo dục / Đào tạo',                                        'giao-duc-dao-tao',          16),
  (null, 'group', 'Lao động phổ thông / Khác',                                 'lao-dong-pho-thong',        17)
on conflict (slug) do nothing;

-- Nhánh nhỏ (branch) sẽ insert ở migration_v4 sau khi chốt danh sách chi tiết
-- cho từng nhóm lớn (đã có gợi ý nhánh trong build_industry_map_v2.py, cần
-- rà lại theo data thật trước khi đưa vào production).


-- ══════════════════════════════════════════════════════════════
-- KIỂM TRA
-- ══════════════════════════════════════════════════════════════
select level, count(*) from public.industries group by level;
select name, slug from public.industries where level = 'group' order by sort_order;
