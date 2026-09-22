-- ============================================================
-- CareerFit — Migration v10: Skills seed v2 (bổ sung ~200 skill)
-- Ưu tiên các nhánh ngành hiện đang ít/không có skill:
--   - ke-toan-tai-chinh-bao-hiem: TRƯỚC ĐÓ 0 SKILL, giờ có bộ đầy đủ
--   - các nhánh Kinh doanh/Marketing/Sản xuất/Lao động phổ thông đang mỏng
--   - thêm catch-all ở cấp NHÓM LỚN cho 5 nhóm chưa có: bat-dong-san,
--     xay-dung, giao-duc-dao-tao, lao-dong-pho-thong, dich-vu-khach-hang
-- Dùng từ ngữ đời thường CV/JD hay viết (không chỉ thuật ngữ hành chính),
-- kèm nhiều alias — vì thuật toán so khớp mới (worker.py/main.py) đã
-- linh hoạt hơn (đủ từ, không cần liền nhau) nhưng vẫn cần đúng từ/đồng
-- nghĩa thật xuất hiện trong CV/JD.
-- Copy toàn bộ file này vào Supabase > SQL Editor > Run
-- ============================================================

-- ── ke-toan-tai-chinh-bao-hiem ── (14 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tư vấn bảo hiểm nhân thọ', ARRAY['life insurance', 'bảo hiểm nhân thọ']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tư vấn bảo hiểm phi nhân thọ', ARRAY['non-life insurance', 'bảo hiểm sức khỏe', 'bảo hiểm xe']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Thẩm định hồ sơ bảo hiểm', ARRAY['underwriting', 'thẩm định rủi ro']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Giải quyết bồi thường', ARRAY['claims processing', 'xử lý bồi thường', 'giám định tổn thất']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Khai thác khách hàng bảo hiểm', ARRAY['insurance sales', 'tư vấn viên bảo hiểm']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tái tục hợp đồng bảo hiểm', ARRAY['policy renewal', 'tái tục hợp đồng']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Quản lý đại lý bảo hiểm', ARRAY['agency management', 'quản lý đại lý']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tư vấn tài chính cá nhân', ARRAY['personal financial planning', 'kế hoạch tài chính']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Chứng chỉ đại lý bảo hiểm', ARRAY['insurance agent license', 'chứng chỉ hành nghề bảo hiểm']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Chăm sóc khách hàng bảo hiểm sau bán', ARRAY['after-sales insurance service']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tính phí bảo hiểm', ARRAY['premium calculation', 'tính phí']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Bancassurance', ARRAY['bán bảo hiểm qua ngân hàng']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Đánh giá rủi ro tài chính', ARRAY['risk assessment', 'đánh giá rủi ro']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Soạn hợp đồng bảo hiểm', ARRAY['policy drafting', 'soạn thảo hợp đồng'])
on conflict do nothing;

-- ── kinh-doanh-ban-hang-thu-ngan ── (6 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Thao tác máy POS', ARRAY['pos machine', 'máy quét mã vạch']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Kiểm đếm tiền mặt', ARRAY['cash handling', 'kiểm quỹ', 'đối soát ca']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Xử lý hóa đơn bán hàng', ARRAY['invoice processing', 'xuất hóa đơn']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Đối soát cuối ca', ARRAY['end of shift reconciliation', 'chốt ca', 'kiểm ca']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Chăm sóc khách tại quầy', ARRAY['counter service', 'phục vụ khách hàng tại quầy']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Sắp xếp hàng hóa quầy thu ngân', ARRAY['merchandising at checkout'])
on conflict do nothing;

-- ── kinh-doanh-ban-hang-ban-le-si ── (6 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý tồn kho cửa hàng', ARRAY['retail inventory management', 'kiểm kê kho']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Trưng bày sản phẩm', ARRAY['visual merchandising', 'trưng bày hàng hóa']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý đơn hàng sỉ', ARRAY['wholesale order management', 'bán sỉ']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Đàm phán giá sỉ', ARRAY['wholesale price negotiation', 'đàm phán giá']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý nhà phân phối', ARRAY['distributor management', 'quản lý đại lý phân phối']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Lập kế hoạch nhập hàng', ARRAY['stock planning', 'kế hoạch nhập hàng'])
on conflict do nothing;

-- ── kinh-doanh-ban-hang-sale ── (6 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Chốt đơn qua điện thoại', ARRAY['telesales closing', 'chốt sale qua sdt']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Khai thác data khách hàng', ARRAY['lead generation', 'khai thác data']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Tư vấn sản phẩm trực tiếp', ARRAY['direct sales consulting', 'tư vấn bán hàng']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Chạy chỉ tiêu doanh số', ARRAY['sales target', 'đạt kpi doanh số', 'chạy target']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Xây dựng mối quan hệ khách hàng', ARRAY['relationship building', 'duy trì khách hàng']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Bán hàng qua livestream', ARRAY['livestream selling', 'bán hàng live'])
on conflict do nothing;

-- ── marketing-to-chuc-su-kien ── (5 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Lập kế hoạch sự kiện', ARRAY['event planning', 'lên kịch bản sự kiện']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Quản lý ngân sách sự kiện', ARRAY['event budget management']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Điều phối hiện trường', ARRAY['on-site coordination', 'điều phối sự kiện']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Làm việc với nhà cung cấp sự kiện', ARRAY['vendor management', 'book địa điểm']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Booking KOL/MC', ARRAY['kol booking', 'booking mc'])
on conflict do nothing;

-- ── marketing-truyen-thong-pr ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Viết thông cáo báo chí', ARRAY['press release', 'viết pr']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Xử lý khủng hoảng truyền thông', ARRAY['crisis communication', 'xử lý khủng hoảng']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Xây dựng quan hệ báo chí', ARRAY['media relations', 'quan hệ báo chí']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Đo lường hiệu quả PR', ARRAY['pr measurement', 'báo cáo truyền thông'])
on conflict do nothing;

-- ── marketing-bien-phien-dich ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Dịch cabin', ARRAY['simultaneous interpretation', 'phiên dịch cabin']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Dịch đuổi', ARRAY['consecutive interpretation', 'phiên dịch đuổi']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Biên dịch tài liệu chuyên ngành', ARRAY['technical translation', 'dịch tài liệu']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Phiên dịch hội nghị', ARRAY['conference interpretation'])
on conflict do nothing;

-- ── marketing-bao-chi-truyen-hinh ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Viết tin bài', ARRAY['news writing', 'viết bài báo']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Dựng phóng sự', ARRAY['video editing for news', 'dựng clip phóng sự']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Sản xuất chương trình truyền hình', ARRAY['tv production', 'sản xuất chương trình']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Dẫn chương trình', ARRAY['hosting', 'mc truyền hình'])
on conflict do nothing;

-- ── marketing-seo-digital ── (5 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Nghiên cứu từ khóa', ARRAY['keyword research', 'research keyword']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Tối ưu on-page', ARRAY['on-page seo', 'tối ưu onpage']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Chạy quảng cáo Google Ads', ARRAY['google ads', 'chạy ads google']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Chạy quảng cáo Facebook Ads', ARRAY['facebook ads', 'chạy ads facebook', 'chạy fb ads']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Phân tích Google Analytics', ARRAY['google analytics', 'đọc số liệu ga'])
on conflict do nothing;

-- ── nhan-su-thu-ky-tro-ly ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Sắp xếp lịch làm việc cho lãnh đạo', ARRAY['calendar management', 'quản lý lịch trình']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Soạn thảo văn bản hành chính', ARRAY['document drafting', 'soạn văn bản']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Sắp xếp công tác/chuyến đi', ARRAY['travel arrangement', 'book vé máy bay công tác']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Ghi chép biên bản họp', ARRAY['meeting minutes', 'ghi biên bản'])
on conflict do nothing;

-- ── nhan-su-hanh-chinh-van-phong ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý văn thư lưu trữ', ARRAY['document management', 'lưu trữ hồ sơ']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý tài sản văn phòng', ARRAY['office asset management', 'quản lý cơ sở vật chất']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Lễ tân văn phòng', ARRAY['front desk', 'tiếp khách văn phòng']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý con dấu', ARRAY['seal management', 'quản lý dấu công ty'])
on conflict do nothing;

-- ── nhan-su-phap-ly-phap-che ── (5 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Soạn thảo hợp đồng lao động', ARRAY['labor contract drafting', 'soạn hợp đồng lao động']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Tư vấn tuân thủ pháp luật', ARRAY['compliance advisory', 'tư vấn pháp chế']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Xử lý tranh chấp lao động', ARRAY['labor dispute resolution', 'giải quyết tranh chấp']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Cập nhật văn bản pháp luật mới', ARRAY['legal update tracking']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Đăng ký nội quy lao động', ARRAY['internal labor regulations'])
on conflict do nothing;

-- ── dich-vu-khach-hang ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Xử lý khiếu nại khách hàng', ARRAY['complaint handling', 'xử lý phàn nàn']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Tư vấn qua tổng đài', ARRAY['call center', 'trực tổng đài']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Chat hỗ trợ khách hàng', ARRAY['live chat support', 'hỗ trợ chat']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Đo lường mức độ hài lòng khách hàng', ARRAY['customer satisfaction', 'khảo sát hài lòng'])
on conflict do nothing;

-- ── thiet-ke-do-hoa ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế ấn phẩm truyền thông', ARRAY['print design', 'thiết kế ấn phẩm']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Sử dụng Canva chuyên nghiệp', ARRAY['canva design']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế UI/UX cơ bản', ARRAY['ui ux design basic']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Xử lý ảnh chuyên sâu Photoshop', ARRAY['photoshop retouching', 'chỉnh ảnh photoshop'])
on conflict do nothing;

-- ── thiet-ke-kien-truc-kien-truc ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Bóc tách khối lượng', ARRAY['quantity takeoff', 'bóc khối lượng']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế bản vẽ thi công', ARRAY['construction drawing', 'vẽ shop drawing'])
on conflict do nothing;

-- ── thiet-ke-my-thuat ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Vẽ minh họa', ARRAY['illustration', 'vẽ illustration']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Dựng mô hình 3D', ARRAY['3d modeling', 'dựng 3d'])
on conflict do nothing;

-- ── thiet-ke-noi-that ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Thiết kế không gian nội thất', ARRAY['interior space design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Chọn vật liệu nội thất', ARRAY['material selection', 'chọn vật liệu'])
on conflict do nothing;

-- ── khach-san-du-lich-le-hanh ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Xây dựng tour du lịch', ARRAY['tour planning', 'thiết kế tour']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Hướng dẫn viên du lịch', ARRAY['tour guide', 'hdv du lịch']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Xử lý visa/vé máy bay', ARRAY['visa processing', 'làm visa', 'book vé']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Chăm sóc đoàn khách', ARRAY['group tour handling'])
on conflict do nothing;

-- ── khach-san-spa-lam-dep ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Massage trị liệu', ARRAY['therapeutic massage', 'massage body']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Chăm sóc da chuyên sâu', ARRAY['skincare treatment', 'chăm sóc da']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Tư vấn liệu trình spa', ARRAY['spa treatment consulting']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Vệ sinh dụng cụ spa theo chuẩn', ARRAY['spa hygiene standard'])
on conflict do nothing;

-- ── khach-san-khach-san ── (5 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Lễ tân khách sạn', ARRAY['hotel front desk', 'receptionist']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Quản lý buồng phòng', ARRAY['housekeeping management']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Xử lý check-in/check-out', ARRAY['check-in check-out']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Xử lý phàn nàn khách lưu trú', ARRAY['guest complaint handling']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Bán phòng/upsell dịch vụ', ARRAY['room upselling', 'upsell dịch vụ khách sạn'])
on conflict do nothing;

-- ── khach-san-nha-hang-fb ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Pha chế đồ uống', ARRAY['bartending', 'pha chế']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Phục vụ bàn chuyên nghiệp', ARRAY['table service', 'phục vụ bàn']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Quản lý order F&B', ARRAY['f&b order management'])
on conflict do nothing;

-- ── y-te-duoc-y-te ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Chăm sóc bệnh nhân nội trú', ARRAY['inpatient care', 'chăm sóc nội trú']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Ghi hồ sơ bệnh án', ARRAY['medical record keeping'])
on conflict do nothing;

-- ── y-te-duoc-duoc-pham ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Tư vấn sử dụng thuốc', ARRAY['medication counseling', 'tư vấn thuốc']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Trình dược viên khu vực', ARRAY['medical representative', 'trình dược viên'])
on conflict do nothing;

-- ── xay-dung ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Giám sát an toàn công trình', ARRAY['site safety supervision', 'an toàn lao động công trình']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Đọc bản vẽ kỹ thuật xây dựng', ARRAY['reading construction drawings', 'đọc bản vẽ']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Nghiệm thu công trình', ARRAY['construction acceptance', 'nghiệm thu'])
on conflict do nothing;

-- ── dien-dien-tu-dien-lanh ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Sửa chữa điện lạnh dân dụng', ARRAY['home appliance repair', 'sửa máy lạnh']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Lắp đặt hệ thống điện', ARRAY['electrical installation', 'lắp đặt điện'])
on conflict do nothing;

-- ── dien-dien-tu-vien-thong-vt ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Lắp đặt trạm BTS', ARRAY['bts installation', 'lắp trạm phát sóng']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Vận hành thiết bị viễn thông', ARRAY['telecom equipment operation'])
on conflict do nothing;

-- ── bat-dong-san ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Tư vấn cho thuê bất động sản', ARRAY['rental consulting', 'cho thuê nhà']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Quản lý sàn giao dịch BĐS', ARRAY['real estate trading floor management']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Đầu tư đất nền', ARRAY['land investment', 'đầu tư đất'])
on conflict do nothing;

-- ── bat-dong-san-moi-gioi ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Chốt giao dịch bất động sản', ARRAY['closing real estate deal', 'chốt deal bđs']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Dẫn khách xem nhà/dự án', ARRAY['property viewing', 'dẫn khách tham quan dự án']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Tư vấn vay ngân hàng mua nhà', ARRAY['mortgage consulting', 'tư vấn vay mua nhà']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Chăm sóc khách hàng sau bán bất động sản', ARRAY['after-sales real estate care'])
on conflict do nothing;

-- ── co-khi-o-to ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Sửa chữa động cơ ô tô', ARRAY['engine repair', 'sửa động cơ']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Chẩn đoán lỗi ô tô bằng máy', ARRAY['car diagnostic tool', 'chẩn đoán lỗi xe'])
on conflict do nothing;

-- ── van-tai-giao-nhan ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Điều phối giao hàng', ARRAY['delivery coordination', 'điều xe giao hàng']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Theo dõi đơn vận chuyển', ARRAY['shipment tracking', 'theo dõi hàng']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Xử lý đơn hàng hoàn/trả', ARRAY['returns handling', 'xử lý hàng hoàn']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Quản lý shipper/đối tác giao hàng', ARRAY['shipper management'])
on conflict do nothing;

-- ── van-tai-xuat-nhap-khau ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Làm thủ tục hải quan', ARRAY['customs clearance', 'khai báo hải quan']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Xin C/O chứng nhận xuất xứ', ARRAY['certificate of origin', 'xin co'])
on conflict do nothing;

-- ── san-xuat-det-may ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Kiểm tra chất lượng vải', ARRAY['fabric quality inspection', 'kiểm vải']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Thiết kế rập/mẫu may', ARRAY['pattern making', 'làm rập']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Vận hành máy may công nghiệp', ARRAY['industrial sewing machine operation']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Quản lý chuyền may', ARRAY['sewing line management', 'quản lý line'])
on conflict do nothing;

-- ── san-xuat-my-pham ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Kiểm nghiệm mỹ phẩm', ARRAY['cosmetic testing', 'kiểm nghiệm sản phẩm']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Công bố sản phẩm mỹ phẩm', ARRAY['cosmetic product registration', 'công bố sản phẩm']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Nghiên cứu công thức mỹ phẩm (R&D)', ARRAY['cosmetic formulation r&d']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Quản lý GMP mỹ phẩm', ARRAY['gmp cosmetic'])
on conflict do nothing;

-- ── san-xuat-quan-ly ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Lập kế hoạch sản xuất', ARRAY['production planning', 'lên kế hoạch sản xuất']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Quản lý năng suất dây chuyền', ARRAY['line productivity management']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Cải tiến quy trình sản xuất (Lean/Kaizen)', ARRAY['lean manufacturing', 'kaizen', 'cải tiến quy trình'])
on conflict do nothing;

-- ── san-xuat-nong-nghiep ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Canh tác theo tiêu chuẩn VietGAP', ARRAY['vietgap standard', 'canh tác vietgap']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Quản lý trang trại', ARRAY['farm management', 'quản lý nông trại'])
on conflict do nothing;

-- ── san-xuat-moi-truong ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Xử lý nước thải', ARRAY['wastewater treatment', 'xử lý nước thải']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Đánh giá tác động môi trường (ĐTM)', ARRAY['environmental impact assessment'])
on conflict do nothing;

-- ── giao-duc-dao-tao ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Thiết kế giáo án', ARRAY['lesson planning', 'soạn giáo án']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Đào tạo kỹ năng mềm', ARRAY['soft skills training', 'training kỹ năng mềm']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Xây dựng chương trình đào tạo nội bộ', ARRAY['internal training program design'])
on conflict do nothing;

-- ── giao-duc-giang-day ── (4 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Giảng dạy trực tuyến', ARRAY['online teaching', 'dạy online']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Ôn luyện thi chứng chỉ (IELTS/TOEIC)', ARRAY['ielts toeic tutoring', 'ôn thi ielts']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Đánh giá kết quả học tập', ARRAY['student assessment', 'đánh giá học sinh']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Quản lý lớp học', ARRAY['classroom management', 'quản lý lớp'])
on conflict do nothing;

-- ── lao-dong-pho-thong ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Làm việc theo ca', ARRAY['shift work', 'làm ca kíp']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Chịu được áp lực công việc tay chân', ARRAY['physical labor tolerance'])
on conflict do nothing;

-- ── lao-dong-pho-thong-tap-vu ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Vệ sinh văn phòng/nhà xưởng', ARRAY['office cleaning', 'vệ sinh công nghiệp']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Sắp xếp kho/hàng hóa', ARRAY['stock arranging', 'sắp xếp kho']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Chuẩn bị trà nước văn phòng', ARRAY['office pantry service'])
on conflict do nothing;

-- ── lao-dong-pho-thong-bao-ve ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Kiểm soát an ninh ra vào', ARRAY['access control', 'kiểm soát ra vào']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Tuần tra canh gác', ARRAY['security patrol', 'tuần tra']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Xử lý tình huống khẩn cấp', ARRAY['emergency response'])
on conflict do nothing;

-- ── lao-dong-pho-thong-cong-nhan ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Vận hành máy sản xuất', ARRAY['machine operation', 'vận hành máy']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Đóng gói sản phẩm', ARRAY['product packaging', 'đóng gói hàng']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Kiểm tra chất lượng đầu ra (QC cơ bản)', ARRAY['basic qc inspection'])
on conflict do nothing;

-- ── kinh-doanh-ban-hang-tong-hop ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Xây dựng kênh phân phối', ARRAY['distribution channel', 'phát triển kênh bán']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Phân tích đối thủ cạnh tranh', ARRAY['competitor analysis', 'phân tích đối thủ']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Lập báo cáo doanh số', ARRAY['sales reporting', 'báo cáo doanh thu'])
on conflict do nothing;

-- ── kinh-doanh-ban-hang-ban-hang ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Tư vấn bán hàng trực tiếp', ARRAY['direct selling', 'tư vấn tại điểm bán']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Xử lý đổi trả hàng', ARRAY['exchange return handling', 'xử lý đổi trả']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Kỹ năng thuyết trình sản phẩm', ARRAY['product presentation', 'demo sản phẩm'])
on conflict do nothing;

-- ── marketing-tong-hop ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Lập kế hoạch marketing tổng thể', ARRAY['marketing plan', 'lập kế hoạch marketing']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Quản lý ngân sách marketing', ARRAY['marketing budget management']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Xây dựng nội dung đa kênh', ARRAY['multi-channel content', 'content đa kênh'])
on conflict do nothing;

-- ── cntt-phan-cung-mang ── (3 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Quản trị hệ thống mạng', ARRAY['network administration', 'quản trị network']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Lắp đặt hạ tầng mạng', ARRAY['network infrastructure setup', 'lắp đặt mạng']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Xử lý sự cố phần cứng', ARRAY['hardware troubleshooting', 'sửa lỗi phần cứng'])
on conflict do nothing;

-- ── ke-toan-tai-chinh-kiem-toan ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Kiểm toán nội bộ', ARRAY['internal audit', 'kiểm toán nội bộ']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Lập báo cáo kiểm toán', ARRAY['audit report', 'báo cáo kiểm toán'])
on conflict do nothing;

-- ── ke-toan-tai-chinh-ngan-hang ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Thẩm định hồ sơ vay', ARRAY['loan appraisal', 'thẩm định vay']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Giao dịch viên ngân hàng', ARRAY['bank teller', 'giao dịch viên'])
on conflict do nothing;

-- ── ke-toan-tai-chinh-tai-chinh ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Phân tích báo cáo tài chính', ARRAY['financial statement analysis', 'phân tích tài chính']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Lập mô hình tài chính', ARRAY['financial modeling', 'lập model tài chính'])
on conflict do nothing;

-- ── ke-toan-tai-chinh-chung-khoan ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Phân tích cổ phiếu', ARRAY['stock analysis', 'phân tích chứng khoán']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Quản lý danh mục đầu tư', ARRAY['portfolio management', 'quản lý danh mục'])
on conflict do nothing;

-- ── nhan-su-tuyen-dung-cb ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Sàng lọc hồ sơ ứng viên', ARRAY['candidate screening', 'sàng lọc cv']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Xây dựng chính sách lương thưởng', ARRAY['compensation and benefits', 'xây dựng c&b'])
on conflict do nothing;

-- ── dich-vu-khach-hang-cskh ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Xử lý cuộc gọi khiếu nại', ARRAY['complaint call handling']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Đo lường NPS/CSAT', ARRAY['nps csat measurement', 'đo lường hài lòng'])
on conflict do nothing;

-- ── co-khi-tu-dong-hoa ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Lập trình PLC', ARRAY['plc programming', 'lập trình plc']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Vận hành hệ thống SCADA', ARRAY['scada operation'])
on conflict do nothing;

-- ── co-khi-che-tao-co-khi ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Vận hành máy CNC', ARRAY['cnc machine operation', 'vận hành cnc']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Đọc bản vẽ kỹ thuật cơ khí', ARRAY['mechanical drawing reading', 'đọc bản vẽ cơ khí'])
on conflict do nothing;

-- ── van-tai-logistics-kho-van ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Quản lý kho bằng WMS', ARRAY['wms system', 'quản lý kho wms']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Sắp xếp hàng hóa trong kho', ARRAY['warehouse arrangement', 'sắp xếp hàng kho'])
on conflict do nothing;

-- ── san-xuat-qa-qc-qa-qc ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Kiểm tra chất lượng đầu vào', ARRAY['incoming quality inspection', 'kiểm ipqc']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Lập báo cáo NCR/CAPA', ARRAY['ncr capa report'])
on conflict do nothing;

-- ── xay-dung-ky-su ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Lập tiến độ thi công', ARRAY['construction schedule', 'lập tiến độ']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Quản lý chi phí công trình', ARRAY['cost management', 'quản lý chi phí xây dựng'])
on conflict do nothing;

-- ── lao-dong-pho-thong-lai-xe ── (2 skill)
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Lái xe an toàn đường dài', ARRAY['long-distance safe driving', 'lái xe đường dài']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Bảo dưỡng xe cơ bản', ARRAY['basic vehicle maintenance'])
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════
-- KIỂM TRA SAU KHI CHẠY
-- ══════════════════════════════════════════════════════════════
select i.slug, count(s.id) as so_skill
from public.industries i
left join public.skills s on s.industry_id = i.id
where i.slug in ('ke-toan-tai-chinh-bao-hiem', 'kinh-doanh-ban-hang-thu-ngan', 'kinh-doanh-ban-hang-ban-le-si', 'kinh-doanh-ban-hang-sale', 'marketing-to-chuc-su-kien', 'marketing-truyen-thong-pr', 'marketing-bien-phien-dich', 'marketing-bao-chi-truyen-hinh', 'marketing-seo-digital', 'nhan-su-thu-ky-tro-ly', 'nhan-su-hanh-chinh-van-phong', 'nhan-su-phap-ly-phap-che', 'dich-vu-khach-hang', 'thiet-ke-do-hoa', 'thiet-ke-kien-truc-kien-truc', 'thiet-ke-my-thuat', 'thiet-ke-noi-that', 'khach-san-du-lich-le-hanh', 'khach-san-spa-lam-dep', 'khach-san-khach-san', 'khach-san-nha-hang-fb', 'y-te-duoc-y-te', 'y-te-duoc-duoc-pham', 'xay-dung', 'dien-dien-tu-dien-lanh', 'dien-dien-tu-vien-thong-vt', 'bat-dong-san', 'bat-dong-san-moi-gioi', 'co-khi-o-to', 'van-tai-giao-nhan', 'van-tai-xuat-nhap-khau', 'san-xuat-det-may', 'san-xuat-my-pham', 'san-xuat-quan-ly', 'san-xuat-nong-nghiep', 'san-xuat-moi-truong', 'giao-duc-dao-tao', 'giao-duc-giang-day', 'lao-dong-pho-thong', 'lao-dong-pho-thong-tap-vu', 'lao-dong-pho-thong-bao-ve', 'lao-dong-pho-thong-cong-nhan', 'kinh-doanh-ban-hang-tong-hop', 'kinh-doanh-ban-hang-ban-hang', 'marketing-tong-hop', 'cntt-phan-cung-mang', 'ke-toan-tai-chinh-kiem-toan', 'ke-toan-tai-chinh-ngan-hang', 'ke-toan-tai-chinh-tai-chinh', 'ke-toan-tai-chinh-chung-khoan', 'nhan-su-tuyen-dung-cb', 'dich-vu-khach-hang-cskh', 'co-khi-tu-dong-hoa', 'co-khi-che-tao-co-khi', 'van-tai-logistics-kho-van', 'san-xuat-qa-qc-qa-qc', 'xay-dung-ky-su', 'lao-dong-pho-thong-lai-xe')
group by i.slug order by so_skill;
