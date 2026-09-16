-- ============================================================
-- CareerFit — Migration v4: Industry Branches (nhánh nhỏ)
-- Chạy SAU migration_v3 (17 nhóm lớn đã có sẵn).
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================
--
-- Ngưỡng giữ nhánh riêng: tổng (CV + JD tags) >= 30 trên data thật
-- (USER_DATA_FINAL.csv + JOB_DATA_FINAL.csv từ timviec365).
-- Nhánh < 30 đã gộp vào nhánh gần nhất trong cùng nhóm lớn.
-- Chi tiết số liệu: packages/ml-service/data/processed/branch_volume.csv
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- NHÓM 1: Kinh doanh / Bán hàng  (slug: kinh-doanh-ban-hang)
-- Tổng thật: CV=196 | JD=3118
-- Telesale (4) → gộp vào ban-hang
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'branch', 'Kinh doanh tổng hợp',         'kinh-doanh-ban-hang-tong-hop',  1),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'branch', 'Bán hàng',                    'kinh-doanh-ban-hang-ban-hang',  2),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'branch', 'Sale / Đại diện kinh doanh',  'kinh-doanh-ban-hang-sale',      3),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'branch', 'Bán lẻ - Bán sỉ',             'kinh-doanh-ban-hang-ban-le-si', 4),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'branch', 'Thu ngân',                    'kinh-doanh-ban-hang-thu-ngan',  5)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 2: Marketing / Truyền thông / Quảng cáo  (slug: marketing-truyen-thong)
-- Tổng thật: CV=163 | JD=1310
-- Quảng cáo (13) + Content (1) → gộp vào marketing-tong-hop
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'Truyền thông / PR',       'marketing-truyen-thong-pr',      1),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'Biên - Phiên dịch',       'marketing-bien-phien-dich',      2),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'Marketing tổng hợp',      'marketing-tong-hop',             3),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'Báo chí - Truyền hình',   'marketing-bao-chi-truyen-hinh',  4),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'SEO / Digital Marketing',  'marketing-seo-digital',          5),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'branch', 'Tổ chức sự kiện',         'marketing-to-chuc-su-kien',      6)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 3: Công nghệ thông tin  (slug: cntt)
-- Tổng thật: CV=69 | JD=1276
-- QA/Tester (4) + Data/AI (2) → gộp vào cntt-phat-trien-phan-mem
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'cntt'), 'branch', 'Phát triển phần mềm',  'cntt-phat-trien-phan-mem', 1),
  ((select id from public.industries where slug = 'cntt'), 'branch', 'Phần cứng / Mạng',     'cntt-phan-cung-mang',      2)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 4: Kế toán / Tài chính / Ngân hàng / Bảo hiểm  (slug: ke-toan-tai-chinh)
-- Tổng thật: CV=156 | JD=1651
-- Tất cả nhánh đều >= 30, giữ nguyên
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Kiểm toán',               'ke-toan-tai-chinh-kiem-toan',   1),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Bảo hiểm',                'ke-toan-tai-chinh-bao-hiem',    2),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Ngân hàng',               'ke-toan-tai-chinh-ngan-hang',   3),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Kế toán',                 'ke-toan-tai-chinh-ke-toan',     4),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Tài chính / Đầu tư',      'ke-toan-tai-chinh-tai-chinh',   5),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'branch', 'Chứng khoán / Đầu tư',   'ke-toan-tai-chinh-chung-khoan', 6)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 5: Nhân sự / Hành chính / Pháp lý  (slug: nhan-su-hanh-chinh)
-- Tổng thật: CV=287 | JD=1067
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'branch', 'Hành chính văn phòng',  'nhan-su-hanh-chinh-van-phong', 1),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'branch', 'Tuyển dụng / C&B',      'nhan-su-tuyen-dung-cb',        2),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'branch', 'Thư ký / Trợ lý',       'nhan-su-thu-ky-tro-ly',        3),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'branch', 'Pháp lý / Pháp chế',    'nhan-su-phap-ly-phap-che',     4)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 6: Dịch vụ khách hàng  (slug: dich-vu-khach-hang)
-- Tổng thật: CV=99 | JD=646
-- CSKH qua điện thoại (50) → gộp vào dich-vu-khach-hang-cskh
-- (cùng chức năng, chỉ khác kênh thực hiện)
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'branch', 'Chăm sóc khách hàng',  'dich-vu-khach-hang-cskh', 1)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 7: Thiết kế / Kiến trúc / Nội thất / Mỹ thuật  (slug: thiet-ke-kien-truc)
-- Tổng thật: CV=37 | JD=363
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'branch', 'Thiết kế đồ họa',       'thiet-ke-do-hoa',            1),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'branch', 'Kiến trúc',             'thiet-ke-kien-truc-kien-truc',2),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'branch', 'Mỹ thuật / Nghệ thuật', 'thiet-ke-my-thuat',           3),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'branch', 'Thiết kế nội thất',     'thiet-ke-noi-that',           4)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 8: Khách sạn / Nhà hàng / Du lịch / Spa  (slug: khach-san-nha-hang-du-lich)
-- Tổng thật: CV=70 | JD=450
-- Lễ tân (18) → gộp vào khach-san-khach-san
-- Bếp/Ẩm thực (20) + Pha chế/Bar (11) → gộp vào khach-san-nha-hang-fb
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'branch', 'Khách sạn',         'khach-san-khach-san',        1),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'branch', 'Du lịch / Lữ hành', 'khach-san-du-lich-le-hanh',  2),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'branch', 'Spa / Làm đẹp',     'khach-san-spa-lam-dep',      3),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'branch', 'Nhà hàng / F&B',    'khach-san-nha-hang-fb',      4)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 9: Y tế / Dược  (slug: y-te-duoc)
-- Tổng thật: CV=55 | JD=252
-- Điều dưỡng (7) → gộp vào y-te-duoc-y-te
-- Trình dược viên (15) → gộp vào y-te-duoc-duoc-pham
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'y-te-duoc'), 'branch', 'Y tế',                         'y-te-duoc-y-te',      1),
  ((select id from public.industries where slug = 'y-te-duoc'), 'branch', 'Dược phẩm / Trình dược viên',  'y-te-duoc-duoc-pham', 2)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 10: Xây dựng  (slug: xay-dung)
-- Tổng thật: CV=38 | JD=227
-- Cầu đường (23) + Dự toán/QS (2) → gộp vào xay-dung-ky-su
-- (cả 3 đều là vai trò kỹ sư/giám sát; dữ liệu nhỏ không tách được tốt)
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'xay-dung'), 'branch', 'Kỹ sư / Giám sát xây dựng',  'xay-dung-ky-su', 1)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 11: Điện / Điện tử / Viễn thông  (slug: dien-dien-tu-vien-thong)
-- Tổng thật: CV=7 | JD=280
-- Điện công nghiệp (20) → gộp vào dien-dien-tu-dien-lanh
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'branch', 'Điện lạnh / Điện dân dụng',  'dien-dien-tu-dien-lanh',   1),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'branch', 'Viễn thông',                  'dien-dien-tu-vien-thong-vt', 2)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 12: Bất động sản  (slug: bat-dong-san)
-- Tổng thật: CV=9 | JD=476
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'bat-dong-san'), 'branch', 'Môi giới / Tư vấn BĐS',  'bat-dong-san-moi-gioi', 1)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 13: Cơ khí / Chế tạo / Tự động hóa / Ô tô  (slug: co-khi-che-tao)
-- Tổng thật: CV=73 | JD=227
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'branch', 'Tự động hóa / PLC / SCADA',  'co-khi-tu-dong-hoa',  1),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'branch', 'Cơ khí chế tạo',             'co-khi-che-tao-co-khi', 2),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'branch', 'Ô tô / Xe máy',              'co-khi-o-to',         3)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 14: Vận tải / Logistics / Xuất nhập khẩu  (slug: van-tai-logistics)
-- Tổng thật: CV=128 | JD=240
-- Lái xe KHÔNG thuộc nhóm này (giữ ở lao-dong-pho-thong theo quyết định đã chốt)
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'van-tai-logistics'), 'branch', 'Logistics / Kho vận',        'van-tai-logistics-kho-van', 1),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'branch', 'Giao nhận / Vận chuyển',     'van-tai-giao-nhan',         2),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'branch', 'Xuất nhập khẩu / Hải quan',  'van-tai-xuat-nhap-khau',    3)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 15: Sản xuất / QA-QC / Công nghiệp chuyên ngành  (slug: san-xuat-qa-qc)
-- Tổng thật: CV=90 | JD=552
-- Dầu khí/Hóa chất (22) + Hàng không/Hàng hải (20) + In ấn/Xuất bản (15)
-- → gộp vào san-xuat-quan-ly (< 30 riêng lẻ; đều là vai trò quản lý sản xuất)
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'QA / QC',                         'san-xuat-qa-qc-qa-qc',    1),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Thực phẩm / Đồ uống (SX)',        'san-xuat-thuc-pham',      2),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Quản lý sản xuất',                'san-xuat-quan-ly',        3),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Dệt may / Da giày',               'san-xuat-det-may',        4),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Mỹ phẩm / Trang sức',             'san-xuat-my-pham',        5),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Nông - Lâm - Ngư nghiệp',         'san-xuat-nong-nghiep',    6),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'branch', 'Môi trường / Xử lý chất thải',    'san-xuat-moi-truong',     7)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 16: Giáo dục / Đào tạo  (slug: giao-duc-dao-tao)
-- Tổng thật: CV=57 | JD=479
-- Trợ giảng (15) + Đào tạo nội bộ (3) → gộp vào giao-duc-giang-day
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'branch', 'Giảng dạy / Đào tạo',  'giao-duc-giang-day', 1)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- NHÓM 17: Lao động phổ thông / Khác  (slug: lao-dong-pho-thong)
-- Tổng thật: CV=1925 | JD=462
-- Lái xe tách riêng (không gộp vào Vận tải/Logistics — quyết định đã chốt)
-- Lao động phổ thông khác (7) → gộp vào cong-nhan
-- ══════════════════════════════════════════════════════════════
insert into public.industries (parent_id, level, name, slug, sort_order) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'branch', 'Lái xe',              'lao-dong-pho-thong-lai-xe',  1),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'branch', 'Công nhân',           'lao-dong-pho-thong-cong-nhan',2),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'branch', 'Tạp vụ / Giúp việc', 'lao-dong-pho-thong-tap-vu',  3),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'branch', 'Bảo vệ',             'lao-dong-pho-thong-bao-ve',  4)
on conflict (slug) do nothing;


-- ══════════════════════════════════════════════════════════════
-- KIỂM TRA SAU KHI CHẠY
-- ══════════════════════════════════════════════════════════════
select
  g.name  as nhom_lon,
  g.slug  as nhom_slug,
  count(b.id) as so_nhanh_nho
from public.industries g
left join public.industries b on b.parent_id = g.id and b.level = 'branch'
where g.level = 'group'
group by g.name, g.slug, g.sort_order
order by g.sort_order;
