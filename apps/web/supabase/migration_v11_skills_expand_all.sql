-- ============================================================
-- CareerFit — Migration v11: Mo rong skill cho TAT CA 73 nganh
--            (17 nhom lon + 56 nhanh nho), moi nganh +10 skill
-- Muc tieu: tang do phu skill de matching CV/JD chinh xac hon
-- cho MOI nganh nghe, khong chi rieng 1 vai nganh nhu v10.
-- Dung 'on conflict do nothing' (unique index lower(name)+industry_id)
-- nen chay lai nhieu lan van an toan, khong trung lap voi v5/v10.
-- Copy toan bo file nay vao Supabase > SQL Editor > Run
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PHAN 1: SKILL CHO 17 NHOM LON (cap tong quat cua ca nganh)
-- ══════════════════════════════════════════════════════════════
-- kinh-doanh-ban-hang
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Đàm phán giá', ARRAY['negotiation', 'thương lượng giá']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Xây dựng mối quan hệ khách hàng', ARRAY['relationship building', 'networking khách hàng']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Dự báo doanh số', ARRAY['sales forecasting']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Quản lý pipeline bán hàng', ARRAY['sales pipeline management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Kỹ năng chốt sale', ARRAY['closing skills', 'chốt đơn hàng']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Phân khúc khách hàng', ARRAY['customer segmentation']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Xây dựng chiến lược giá', ARRAY['pricing strategy']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Quản lý mục tiêu kinh doanh', ARRAY['business target management', 'okr kinh doanh']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Phát triển sản phẩm ra thị trường', ARRAY['go-to-market']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang'), 'hard', 'Kỹ năng thuyết phục', ARRAY['persuasion skills'])
on conflict do nothing;

-- marketing-truyen-thong
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Content Strategy', ARRAY['chiến lược nội dung']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Social Media Marketing', ARRAY['marketing mạng xã hội']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Branding', ARRAY['xây dựng thương hiệu tổng thể']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Media Planning', ARRAY['kế hoạch truyền thông']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Storytelling', ARRAY['kể chuyện thương hiệu']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Quản lý ngân sách marketing', ARRAY['marketing budget management']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Customer Insight', ARRAY['thấu hiểu khách hàng', 'consumer insight']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Digital Advertising', ARRAY['quảng cáo số']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'KOL/Influencer Management', ARRAY['quản lý kol', 'influencer marketing management']),
  ((select id from public.industries where slug = 'marketing-truyen-thong'), 'hard', 'Xây dựng bộ nhận diện thương hiệu', ARRAY['brand guideline'])
on conflict do nothing;

-- cntt
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Docker', ARRAY['container', 'containerization']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Cloud Computing', ARRAY['aws', 'azure', 'gcp']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Database Design', ARRAY['thiết kế cơ sở dữ liệu']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'System Design', ARRAY['thiết kế hệ thống']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Unit Testing', ARRAY['kiểm thử đơn vị', 'tdd']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Debugging', ARRAY['gỡ lỗi phần mềm']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Quản lý mã nguồn', ARRAY['source control', 'version control']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Bảo mật thông tin cơ bản', ARRAY['basic security', 'infosec']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Object-Oriented Programming', ARRAY['oop', 'lập trình hướng đối tượng']),
  ((select id from public.industries where slug = 'cntt'), 'hard', 'Data Structures & Algorithms', ARRAY['cấu trúc dữ liệu và giải thuật', 'dsa'])
on conflict do nothing;

-- ke-toan-tai-chinh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'IFRS', ARRAY['chuẩn mực báo cáo tài chính quốc tế']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Kế toán quản trị', ARRAY['management accounting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Phân tích chi phí', ARRAY['cost analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Quản lý dòng tiền', ARRAY['cash flow management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Lập dự toán ngân sách', ARRAY['budgeting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Kiểm soát nội bộ', ARRAY['internal control']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Thuế thu nhập doanh nghiệp', ARRAY['corporate income tax', 'ctax']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Kiểm soát công nợ', ARRAY['debt control', 'accounts receivable control']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Phân tích rủi ro tài chính', ARRAY['financial risk analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh'), 'hard', 'Excel nâng cao cho tài chính', ARRAY['pivot table', 'advanced excel'])
on conflict do nothing;

-- nhan-su-hanh-chinh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Tuyển dụng nhân sự', ARRAY['recruitment']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Xây dựng chính sách nhân sự', ARRAY['hr policy']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Quản lý hồ sơ nhân viên', ARRAY['employee records management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Văn hóa doanh nghiệp', ARRAY['corporate culture']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Quan hệ lao động', ARRAY['labor relations']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Đánh giá hiệu suất nhân viên', ARRAY['performance appraisal']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Quản lý hành chính tổng hợp', ARRAY['general admin management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Tổ chức sự kiện nội bộ', ARRAY['internal event organizing']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Soạn thảo quy trình nội bộ', ARRAY['sop', 'quy trình vận hành chuẩn']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh'), 'hard', 'Kỹ năng giải quyết xung đột', ARRAY['conflict resolution'])
on conflict do nothing;

-- dich-vu-khach-hang
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Kỹ năng lắng nghe khách hàng', ARRAY['active listening']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Xử lý tình huống khách hàng khó', ARRAY['difficult customer handling']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Quản lý phản hồi khách hàng', ARRAY['feedback management']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Kỹ năng tổng đài viên', ARRAY['call center agent skills']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Viết email chăm sóc khách hàng', ARRAY['customer service email writing']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Quản lý cơ sở dữ liệu khách hàng', ARRAY['customer database management']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Đào tạo quy trình dịch vụ khách hàng', ARRAY['service training']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Xử lý yêu cầu bảo hành đổi trả', ARRAY['warranty and return handling']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Giao tiếp đa kênh', ARRAY['omnichannel support']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang'), 'hard', 'Xây dựng quy trình chăm sóc khách hàng', ARRAY['customer care sop'])
on conflict do nothing;

-- thiet-ke-kien-truc
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Vẽ phác thảo tay', ARRAY['sketching']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Lý thuyết màu sắc', ARRAY['color theory']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Xây dựng portfolio', ARRAY['portfolio design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Concept Development', ARRAY['phát triển ý tưởng thiết kế']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Bố cục thiết kế', ARRAY['layout design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Thuyết trình ý tưởng thiết kế', ARRAY['design presentation']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Vật liệu và hoàn thiện', ARRAY['material and finishing']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Thiết kế bền vững', ARRAY['sustainable design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Trình chiếu 3D', ARRAY['3d rendering']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc'), 'hard', 'Quản lý dự án thiết kế', ARRAY['design project management'])
on conflict do nothing;

-- khach-san-nha-hang-du-lich
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Giao tiếp đa văn hóa', ARRAY['cross-cultural communication']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Xử lý phàn nàn khách hàng dịch vụ', ARRAY['complaint handling']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Quản lý ca làm việc', ARRAY['shift management']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Sơ cứu cơ bản', ARRAY['basic first aid']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Kỹ năng bán chéo dịch vụ', ARRAY['upselling dịch vụ']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Tiếng Anh chuyên ngành nhà hàng khách sạn', ARRAY['hospitality english']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Quản lý chất lượng dịch vụ', ARRAY['service quality management']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Ứng xử với khách VIP', ARRAY['vip guest handling']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Làm việc nhóm theo ca kíp', ARRAY['shift teamwork']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-du-lich'), 'hard', 'Quy trình PCCC trong khách sạn nhà hàng', ARRAY['fire safety procedure'])
on conflict do nothing;

-- y-te-duoc
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Đạo đức nghề y', ARRAY['medical ethics']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Giao tiếp với bệnh nhân', ARRAY['patient communication']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Quy trình vô khuẩn', ARRAY['sterilization procedure']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Sử dụng thiết bị y tế', ARRAY['medical equipment operation']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Quản lý thuốc và vật tư y tế', ARRAY['medical supply management']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Cấp cứu ban đầu', ARRAY['first response', 'emergency care']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Tư vấn sức khỏe', ARRAY['health counseling']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Ghi chép hồ sơ y tế điện tử', ARRAY['emr', 'electronic medical record']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Kiểm soát nhiễm khuẩn bệnh viện', ARRAY['hospital infection control']),
  ((select id from public.industries where slug = 'y-te-duoc'), 'hard', 'Phối hợp đa chuyên khoa', ARRAY['interdisciplinary coordination'])
on conflict do nothing;

-- xay-dung
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Lập hồ sơ hoàn công', ARRAY['as-built documentation']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Quản lý vật tư công trình', ARRAY['construction material management']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Bóc tách khối lượng xây dựng', ARRAY['quantity takeoff']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Thi công phần thô', ARRAY['structural construction']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Thi công hoàn thiện', ARRAY['finishing works']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Quản lý nhà thầu phụ', ARRAY['subcontractor management']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Lập dự toán xây dựng', ARRAY['construction estimating']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Kiểm soát chất lượng công trình', ARRAY['qa qc xây dựng']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'Quản lý tiến độ dự án xây dựng', ARRAY['construction schedule management']),
  ((select id from public.industries where slug = 'xay-dung'), 'hard', 'An toàn vệ sinh lao động công trình', ARRAY['construction ohs'])
on conflict do nothing;

-- dien-dien-tu-vien-thong
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Đọc sơ đồ điện', ARRAY['electrical schematic reading']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Lắp đặt hệ thống điện dân dụng', ARRAY['residential electrical installation']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Sửa chữa thiết bị điện tử', ARRAY['electronics repair']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Bảo trì hệ thống điện', ARRAY['electrical maintenance']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'PLC cơ bản', ARRAY['basic plc']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Đo kiểm thiết bị điện', ARRAY['electrical testing']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Thi công hệ thống điện nhẹ', ARRAY['elv system']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Điện mặt trời / Năng lượng tái tạo', ARRAY['solar energy', 'renewable energy']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Vận hành trạm biến áp', ARRAY['substation operation']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong'), 'hard', 'Thiết kế mạch điện tử', ARRAY['circuit design'])
on conflict do nothing;

-- bat-dong-san
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Marketing bất động sản', ARRAY['real estate marketing']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Quản lý dự án bất động sản', ARRAY['real estate project management']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Thẩm định giá đất', ARRAY['land valuation']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Tư vấn quy hoạch dự án', ARRAY['zoning consulting', 'planning consulting']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Quản lý quỹ đất', ARRAY['land bank management']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Xây dựng kênh phân phối bất động sản', ARRAY['real estate distribution network']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Phân tích dòng vốn đầu tư bất động sản', ARRAY['real estate investment analysis']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Quản lý vận hành tòa nhà khu đô thị', ARRAY['property management']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Xử lý hồ sơ pháp lý sổ đỏ sổ hồng', ARRAY['land title processing']),
  ((select id from public.industries where slug = 'bat-dong-san'), 'hard', 'Tư vấn tài chính bất động sản', ARRAY['real estate financing consulting'])
on conflict do nothing;

-- co-khi-che-tao
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'SolidWorks', ARRAY['solidworks cad']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Đo lường và kiểm tra kích thước', ARRAY['metrology', 'dimensional inspection']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Gia công CNC tổng quát', ARRAY['cnc machining']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Vật liệu cơ khí', ARRAY['mechanical materials']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Bảo trì máy công nghiệp', ARRAY['industrial machine maintenance']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Thiết kế khuôn mẫu', ARRAY['mold design', 'die design']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Quản lý chất lượng cơ khí', ARRAY['mechanical qa']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Kỹ thuật hàn nâng cao', ARRAY['advanced welding']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Tự động hóa dây chuyền cơ khí', ARRAY['mechanical line automation']),
  ((select id from public.industries where slug = 'co-khi-che-tao'), 'hard', 'Lắp ráp cơ khí', ARRAY['mechanical assembly'])
on conflict do nothing;

-- van-tai-logistics
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Quản lý vận tải đường bộ', ARRAY['road transport management']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Tối ưu tuyến đường', ARRAY['route optimization']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Quản lý đội xe', ARRAY['fleet management']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Quản lý vận chuyển đa phương thức', ARRAY['multimodal transport']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Đàm phán giá vận chuyển', ARRAY['freight rate negotiation']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Quản lý đối tác 3PL/4PL', ARRAY['3pl 4pl management']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Theo dõi và xử lý sự cố vận chuyển', ARRAY['shipment exception handling']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Lập chứng từ vận tải', ARRAY['transport documentation']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Tối ưu chi phí logistics', ARRAY['logistics cost optimization']),
  ((select id from public.industries where slug = 'van-tai-logistics'), 'hard', 'Quản lý kho ngoại quan', ARRAY['bonded warehouse management'])
on conflict do nothing;

-- san-xuat-qa-qc
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Six Sigma', ARRAY['six sigma green belt']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'TPM - Total Productive Maintenance', ARRAY['bảo trì năng suất toàn diện']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Quản lý an toàn sản xuất', ARRAY['manufacturing safety management']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Đọc bản vẽ kỹ thuật sản xuất', ARRAY['reading technical drawings']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Quản lý chất lượng nhà cung cấp', ARRAY['supplier quality management']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Cải tiến liên tục', ARRAY['continuous improvement']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Lập kế hoạch chất lượng', ARRAY['quality planning']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Đào tạo an toàn sản xuất', ARRAY['manufacturing safety training']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Phân tích nguyên nhân gốc', ARRAY['root cause analysis']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc'), 'hard', 'Kiểm soát tài liệu chất lượng', ARRAY['document control iso'])
on conflict do nothing;

-- giao-duc-dao-tao
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Quản lý lớp học trực tuyến', ARRAY['online classroom management']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Đánh giá năng lực học viên', ARRAY['learner assessment']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Xây dựng học liệu', ARRAY['learning materials development']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Tư vấn hướng nghiệp', ARRAY['career counseling']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Quản lý trung tâm giáo dục', ARRAY['education center management']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Ứng dụng công nghệ trong giảng dạy', ARRAY['edtech']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Thiết kế bài kiểm tra đánh giá', ARRAY['assessment design']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Đào tạo giáo viên', ARRAY['teacher training', 'tot']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Xây dựng chương trình học', ARRAY['curriculum development']),
  ((select id from public.industries where slug = 'giao-duc-dao-tao'), 'hard', 'Quản lý học sinh sinh viên', ARRAY['student management'])
on conflict do nothing;

-- lao-dong-pho-thong
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Tuân thủ nội quy lao động', ARRAY['workplace rules compliance']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Làm việc nhóm cơ bản', ARRAY['basic teamwork']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Sử dụng công cụ lao động cơ bản', ARRAY['basic tool usage']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'An toàn vệ sinh lao động cơ bản', ARRAY['basic ohs']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Chăm chỉ, chịu khó', ARRAY['diligence', 'hard work']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Sức khỏe tốt, chịu được cường độ cao', ARRAY['physical stamina']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Giao tiếp cơ bản nơi làm việc', ARRAY['basic workplace communication']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Trung thực, cẩn thận trong công việc', ARRAY['honesty and carefulness']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Khả năng học nghề nhanh', ARRAY['quick on-the-job learning']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong'), 'hard', 'Tuân thủ giờ giấc làm việc', ARRAY['punctuality'])
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════
-- PHAN 2: SKILL CHO 56 NHANH NHO (cap chi tiet, chuyen sau)
-- ══════════════════════════════════════════════════════════════
-- kinh-doanh-ban-hang-tong-hop
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Xây dựng chiến lược kinh doanh dài hạn', ARRAY['long-term business strategy']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Phân tích SWOT', ARRAY['swot analysis']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Quản lý ngân sách kinh doanh', ARRAY['business budget management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Phát triển đối tác chiến lược', ARRAY['strategic partnership development']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Nghiên cứu nhu cầu thị trường', ARRAY['market needs research']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Lập kế hoạch bán hàng theo mùa vụ', ARRAY['seasonal sales planning']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Quản lý rủi ro kinh doanh', ARRAY['business risk management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Tư vấn giải pháp kinh doanh cho khách hàng', ARRAY['business solution consulting']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Phát triển thị trường quốc tế', ARRAY['international market development']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-tong-hop'), 'hard', 'Đánh giá hiệu quả kênh bán', ARRAY['sales channel performance evaluation'])
on conflict do nothing;

-- kinh-doanh-ban-hang-ban-hang
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Bán hàng theo nhóm sản phẩm', ARRAY['product-line selling']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Xây dựng kịch bản bán hàng', ARRAY['sales script development']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Tư vấn theo nhu cầu khách hàng', ARRAY['needs-based selling']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Quản lý danh sách khách hàng tiềm năng', ARRAY['lead list management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Chăm sóc khách hàng sau bán', ARRAY['post-sale customer care']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Kỹ năng xử lý từ chối', ARRAY['handling rejection']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Bán hàng đa kênh', ARRAY['omnichannel selling']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Giới thiệu sản phẩm mới', ARRAY['new product introduction']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Theo dõi đơn hàng khách lẻ', ARRAY['retail order tracking']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-hang'), 'hard', 'Xây dựng lòng tin khách hàng', ARRAY['building customer trust'])
on conflict do nothing;

-- kinh-doanh-ban-hang-sale
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Lập báo giá', ARRAY['quotation preparation']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Quản lý hợp đồng bán hàng', ARRAY['sales contract management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Chốt hợp đồng lớn', ARRAY['enterprise deal closing']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Networking khách hàng doanh nghiệp', ARRAY['b2b networking']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Xây dựng mối quan hệ đối tác lâu dài', ARRAY['long-term partnership building']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Phân tích nhu cầu khách hàng doanh nghiệp', ARRAY['b2b needs analysis']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Lập kế hoạch chăm sóc khách hàng theo quý', ARRAY['quarterly account planning']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Thuyết trình giải pháp cho ban lãnh đạo', ARRAY['c-level presentation']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Dự báo doanh số cá nhân', ARRAY['personal sales forecasting']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-sale'), 'hard', 'Quản lý cơ hội bán hàng trên CRM', ARRAY['crm opportunity management'])
on conflict do nothing;

-- kinh-doanh-ban-hang-ban-le-si
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý chuỗi cửa hàng', ARRAY['retail chain management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Lập kế hoạch khuyến mãi', ARRAY['promotion planning']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Kiểm soát hàng thất thoát', ARRAY['shrinkage control']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Đào tạo nhân viên bán hàng', ARRAY['sales staff training']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý giá bán lẻ theo khu vực', ARRAY['regional pricing management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Đặt hàng và bổ sung hàng hóa', ARRAY['replenishment']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Phân tích doanh số theo mặt hàng', ARRAY['sku performance analysis']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Quản lý mối quan hệ nhà cung cấp sỉ', ARRAY['wholesale supplier relations']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Setup gian hàng showroom', ARRAY['store showroom setup']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-ban-le-si'), 'hard', 'Kiểm soát chất lượng hàng nhập', ARRAY['inbound quality check'])
on conflict do nothing;

-- kinh-doanh-ban-hang-thu-ngan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Xử lý thanh toán thẻ', ARRAY['card payment processing']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Xử lý thanh toán ví điện tử QR', ARRAY['e-wallet qr payment']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Kiểm tra tiền giả', ARRAY['counterfeit money detection']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Quản lý quỹ tiền mặt ca làm việc', ARRAY['cash drawer management']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Giải quyết khiếu nại tại quầy thu ngân', ARRAY['front-desk complaint handling']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Nhập liệu bán hàng chính xác', ARRAY['accurate sales data entry']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Hỗ trợ khách hàng tại điểm bán', ARRAY['pos customer support']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Kiểm tra hạn sử dụng hàng hóa', ARRAY['expiry date checking']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Sắp xếp quầy thanh toán gọn gàng', ARRAY['checkout area organization']),
  ((select id from public.industries where slug = 'kinh-doanh-ban-hang-thu-ngan'), 'hard', 'Xử lý phiếu giảm giá voucher', ARRAY['coupon voucher processing'])
on conflict do nothing;

-- marketing-truyen-thong-pr
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Xây dựng nhận diện thương hiệu qua PR', ARRAY['brand identity via pr']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Viết bài PR sản phẩm', ARRAY['product pr writing']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Quan hệ với KOL Influencer', ARRAY['kol relations']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Tổ chức họp báo', ARRAY['press conference organizing']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Theo dõi và đo lường truyền thông', ARRAY['media monitoring']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Xây dựng câu chuyện thương hiệu', ARRAY['brand storytelling']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Quản lý danh sách báo chí', ARRAY['media list management']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Xử lý phát ngôn khủng hoảng', ARRAY['crisis spokesperson support']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Lập kế hoạch CSR cộng đồng', ARRAY['csr community pr planning']),
  ((select id from public.industries where slug = 'marketing-truyen-thong-pr'), 'hard', 'Đánh giá hiệu quả chiến dịch PR', ARRAY['pr campaign evaluation'])
on conflict do nothing;

-- marketing-bien-phien-dich
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Dịch song song', ARRAY['simultaneous interpretation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Biên dịch hợp đồng thương mại', ARRAY['commercial contract translation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Dịch thuật kỹ thuật', ARRAY['technical translation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Hiệu đính bản dịch', ARRAY['translation proofreading']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Biên dịch tài liệu marketing', ARRAY['marketing content translation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Phiên dịch tháp tùng', ARRAY['escort interpretation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Sử dụng phần mềm hỗ trợ dịch', ARRAY['sdl trados', 'memoq']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Dịch phụ đề video', ARRAY['video subtitle translation']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Quản lý thuật ngữ chuyên ngành', ARRAY['terminology management']),
  ((select id from public.industries where slug = 'marketing-bien-phien-dich'), 'hard', 'Biên dịch tài liệu pháp lý', ARRAY['legal document translation'])
on conflict do nothing;

-- marketing-tong-hop
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Xây dựng customer journey', ARRAY['customer journey mapping']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Quản lý dự án marketing', ARRAY['marketing project management']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Phân tích ROI chiến dịch', ARRAY['campaign roi analysis']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Xây dựng landing page', ARRAY['landing page building']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Thiết lập luồng marketing automation', ARRAY['automation flow setup']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'CRM Marketing', ARRAY['crm-based marketing']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Growth Hacking', ARRAY['tăng trưởng nhanh']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Lập kế hoạch ngân sách theo kênh', ARRAY['channel budget allocation']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Quản lý agency đối tác', ARRAY['agency management']),
  ((select id from public.industries where slug = 'marketing-tong-hop'), 'hard', 'Nghiên cứu insight khách hàng', ARRAY['consumer insight research'])
on conflict do nothing;

-- marketing-bao-chi-truyen-hinh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Biên tập video', ARRAY['video editing workflow']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Viết lời bình voice-over', ARRAY['voice-over script writing']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Dựng âm thanh hậu kỳ', ARRAY['audio post-production']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Sản xuất nội dung podcast', ARRAY['podcast production']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Kỹ thuật ánh sáng quay hình', ARRAY['lighting technique']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Kỹ thuật quay flycam drone', ARRAY['drone videography']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Biên tập tin tức thời sự', ARRAY['news editing']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Sản xuất nội dung video ngắn', ARRAY['short-form video production']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Sản xuất chương trình livestream', ARRAY['live production']),
  ((select id from public.industries where slug = 'marketing-bao-chi-truyen-hinh'), 'hard', 'Kỹ năng phỏng vấn nhân vật', ARRAY['interviewing skills'])
on conflict do nothing;

-- marketing-seo-digital
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Technical SEO', ARRAY['seo kỹ thuật']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Content SEO', ARRAY['seo nội dung']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Local SEO', ARRAY['seo địa phương']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Tối ưu landing page chuyển đổi', ARRAY['landing page optimization']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Google Tag Manager', ARRAY['gtm']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Facebook Pixel / Conversion Tracking', ARRAY['theo dõi chuyển đổi']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Quản lý chiến dịch Google Shopping', ARRAY['google shopping campaign']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Phân tích hành vi người dùng web', ARRAY['hotjar', 'web behavior analytics']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Tối ưu tỷ lệ chuyển đổi', ARRAY['cro', 'conversion rate optimization']),
  ((select id from public.industries where slug = 'marketing-seo-digital'), 'hard', 'Chạy quảng cáo TikTok Ads', ARRAY['tiktok ads'])
on conflict do nothing;

-- marketing-to-chuc-su-kien
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Quản lý rủi ro sự kiện', ARRAY['event risk management']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Thiết kế trải nghiệm sự kiện', ARRAY['event experience design']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Quản lý vé và đăng ký tham dự', ARRAY['ticketing registration management']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Sản xuất nội dung truyền thông sự kiện', ARRAY['event content production']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Livestream sự kiện', ARRAY['event livestreaming']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Quản lý đối tác tài trợ', ARRAY['sponsor management']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Kiểm soát an ninh sự kiện', ARRAY['event security coordination']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Setup âm thanh ánh sáng sự kiện', ARRAY['av setup coordination']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Đo lường hiệu quả sự kiện', ARRAY['event roi measurement']),
  ((select id from public.industries where slug = 'marketing-to-chuc-su-kien'), 'hard', 'Điều phối tình nguyện viên nhân sự sự kiện', ARRAY['volunteer staff coordination'])
on conflict do nothing;

-- cntt-phat-trien-phan-mem
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Golang', ARRAY['go language']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Ruby on Rails', ARRAY['rails']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'gRPC', ARRAY['grpc protocol']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Apache Kafka', ARRAY['kafka']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'RabbitMQ', ARRAY['message queue']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Elasticsearch', ARRAY['elastic stack']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Terraform', ARRAY['infrastructure as code']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Jenkins CI', ARRAY['jenkins pipeline']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Unit Testing / TDD', ARRAY['kiểm thử đơn vị']),
  ((select id from public.industries where slug = 'cntt-phat-trien-phan-mem'), 'hard', 'Thiết kế hệ thống phân tán', ARRAY['distributed system design'])
on conflict do nothing;

-- cntt-phan-cung-mang
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Ansible', ARRAY['configuration management']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Load Balancer', ARRAY['cân bằng tải']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'SD-WAN', ARRAY['software-defined wan']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Zabbix / Nagios Monitoring', ARRAY['network monitoring']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Active Directory', ARRAY['quản trị active directory']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Linux Server Administration', ARRAY['quản trị server linux']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Cloud Networking', ARRAY['aws vpc', 'azure vnet']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Wireshark / Network Troubleshooting', ARRAY['phân tích lỗi mạng']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'Bảo trì phần cứng server', ARRAY['server hardware maintenance']),
  ((select id from public.industries where slug = 'cntt-phan-cung-mang'), 'hard', 'ITIL / IT Service Management', ARRAY['quản lý dịch vụ it'])
on conflict do nothing;

-- ke-toan-tai-chinh-kiem-toan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Soát xét báo cáo tài chính', ARRAY['financial statement review']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Đánh giá hệ thống kiểm soát nội bộ', ARRAY['internal control assessment']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Kiểm toán thuế', ARRAY['tax audit']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Kiểm toán tuân thủ', ARRAY['compliance audit']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Chọn mẫu kiểm toán', ARRAY['audit sampling']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Đánh giá trọng yếu', ARRAY['materiality assessment']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Soạn thư quản lý', ARRAY['management letter drafting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Kiểm toán hệ thống ERP', ARRAY['erp audit']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Đào tạo trợ lý kiểm toán', ARRAY['audit associate training']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-kiem-toan'), 'hard', 'Kiểm toán nội bộ theo tiêu chuẩn IIA', ARRAY['iia standard internal audit'])
on conflict do nothing;

-- ke-toan-tai-chinh-bao-hiem
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Bảo hiểm sức khỏe doanh nghiệp', ARRAY['corporate health insurance']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tư vấn bảo hiểm hưu trí', ARRAY['retirement insurance consulting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Quản lý hợp đồng bảo hiểm nhóm', ARRAY['group insurance contract management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Đánh giá hồ sơ yêu cầu bồi thường', ARRAY['claims assessment']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Xây dựng mạng lưới khách hàng bảo hiểm', ARRAY['insurance client network building']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Bảo hiểm tài sản kỹ thuật', ARRAY['property engineering insurance']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Tư vấn bảo hiểm doanh nghiệp', ARRAY['corporate insurance consulting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Thẩm định bảo hiểm', ARRAY['underwriting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Đào tạo đại lý bảo hiểm mới', ARRAY['new agent training']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-bao-hiem'), 'hard', 'Hỗ trợ khách hàng qua ứng dụng bảo hiểm số', ARRAY['insurtech app support'])
on conflict do nothing;

-- ke-toan-tai-chinh-ngan-hang
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Tư vấn tài chính cá nhân tại ngân hàng', ARRAY['personal banking advisory']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Quản lý quan hệ khách hàng doanh nghiệp', ARRAY['corporate relationship management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Thẩm định dự án cho vay', ARRAY['loan project appraisal']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Xử lý hồ sơ mở thẻ', ARRAY['card issuance processing']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Ngân hàng số', ARRAY['digital banking operations']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Quản lý rủi ro tín dụng', ARRAY['credit risk management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Tư vấn đầu tư tại ngân hàng', ARRAY['bank investment advisory']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Xử lý giao dịch chuyển tiền quốc tế', ARRAY['international remittance processing']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Bán chéo sản phẩm ngân hàng', ARRAY['cross-selling banking products']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ngan-hang'), 'hard', 'Quản lý danh mục cho vay', ARRAY['loan portfolio management'])
on conflict do nothing;

-- ke-toan-tai-chinh-ke-toan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Kế toán tài sản cố định', ARRAY['fixed asset accounting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Đối chiếu số dư ngân hàng', ARRAY['bank reconciliation']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Lập báo cáo thuế GTGT', ARRAY['vat report preparation']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Kế toán chi phí sản xuất', ARRAY['cost accounting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Kế toán doanh thu', ARRAY['revenue accounting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Kiểm kê tài sản định kỳ', ARRAY['periodic asset stocktaking']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Fast Accounting Software', ARRAY['phần mềm kế toán fast']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Lập báo cáo quản trị', ARRAY['management reporting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Kế toán xây dựng cơ bản', ARRAY['construction accounting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-ke-toan'), 'hard', 'Xử lý bút toán điều chỉnh cuối kỳ', ARRAY['period-end adjusting entries'])
on conflict do nothing;

-- ke-toan-tai-chinh-tai-chinh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Định giá cổ phần', ARRAY['equity valuation']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Phân tích M&A', ARRAY['mergers and acquisitions analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Lập kế hoạch tài chính cá nhân', ARRAY['personal financial planning']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Quản lý quỹ đầu tư', ARRAY['fund management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Phân tích rủi ro danh mục', ARRAY['portfolio risk analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Huy động vốn', ARRAY['capital raising', 'fundraising']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Excel VBA cho tài chính', ARRAY['financial vba modeling']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Lập báo cáo quan hệ nhà đầu tư', ARRAY['investor relations reporting']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Phân tích ngành', ARRAY['industry analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-tai-chinh'), 'hard', 'Thẩm định dự án đầu tư', ARRAY['investment project appraisal'])
on conflict do nothing;

-- ke-toan-tai-chinh-chung-khoan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Môi giới chứng khoán', ARRAY['securities brokerage']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Tư vấn đầu tư chứng khoán', ARRAY['securities investment advisory']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Phân tích vĩ mô', ARRAY['macro analysis']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Viết báo cáo phân tích cổ phiếu', ARRAY['equity research report writing']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Quản trị rủi ro đầu tư', ARRAY['investment risk management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Giao dịch phái sinh', ARRAY['derivatives trading']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Sử dụng phần mềm giao dịch', ARRAY['amibroker', 'metastock']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Chứng chỉ CFA', ARRAY['cfa certification']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Quản lý quỹ mở', ARRAY['open-end fund management']),
  ((select id from public.industries where slug = 'ke-toan-tai-chinh-chung-khoan'), 'hard', 'Phân tích dòng tiền doanh nghiệp niêm yết', ARRAY['listed company cash flow analysis'])
on conflict do nothing;

-- nhan-su-hanh-chinh-van-phong
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý văn phòng phẩm', ARRAY['office supplies management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý hợp đồng thuê văn phòng', ARRAY['office lease management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Điều phối xe đưa đón', ARRAY['shuttle transport coordination']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý an toàn vệ sinh văn phòng', ARRAY['office safety hygiene management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Tổ chức lưu trữ tài liệu số', ARRAY['digital document archiving']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Hỗ trợ hậu cần sự kiện nội bộ', ARRAY['internal event logistics support']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý hệ thống camera an ninh văn phòng', ARRAY['office cctv management']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Làm việc với đối tác dịch vụ vệ sinh bảo trì', ARRAY['facility vendor coordination']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Soạn thảo thông báo nội bộ', ARRAY['internal memo drafting']),
  ((select id from public.industries where slug = 'nhan-su-hanh-chinh-van-phong'), 'hard', 'Quản lý phòng họp', ARRAY['meeting room management'])
on conflict do nothing;

-- nhan-su-tuyen-dung-cb
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Xây dựng thương hiệu tuyển dụng', ARRAY['employer branding']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Headhunting', ARRAY['săn đầu người']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Phỏng vấn sàng lọc', ARRAY['screening interview']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Xây dựng khung năng lực', ARRAY['competency framework']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Quản lý bảo hiểm xã hội y tế', ARRAY['social health insurance administration']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Xây dựng thang bảng lương', ARRAY['salary scale building']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Phân tích dữ liệu tuyển dụng', ARRAY['recruitment analytics']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Payroll Outsourcing', ARRAY['dịch vụ tính lương thuê ngoài']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Xây dựng lộ trình phát triển nhân viên', ARRAY['career development path']),
  ((select id from public.industries where slug = 'nhan-su-tuyen-dung-cb'), 'hard', 'Quản lý ngân sách nhân sự', ARRAY['hr budget management'])
on conflict do nothing;

-- nhan-su-thu-ky-tro-ly
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Chuẩn bị tài liệu họp', ARRAY['meeting document preparation']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Hỗ trợ dự án nhỏ cho lãnh đạo', ARRAY['executive project support']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Sắp xếp ưu tiên công việc', ARRAY['task prioritization']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Kỹ năng bảo mật thông tin', ARRAY['confidentiality', 'information security']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Hỗ trợ quan hệ đối ngoại', ARRAY['external relations support']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Theo dõi tiến độ công việc của lãnh đạo', ARRAY['follow-up tracking']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Tổ chức tiếp khách', ARRAY['guest hosting for executives']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Quản lý hồ sơ cá nhân của lãnh đạo', ARRAY['executive records management']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Kỹ năng đa nhiệm', ARRAY['multitasking']),
  ((select id from public.industries where slug = 'nhan-su-thu-ky-tro-ly'), 'hard', 'Tiếng Anh văn phòng cho trợ lý', ARRAY['business english for assistants'])
on conflict do nothing;

-- nhan-su-phap-ly-phap-che
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Rà soát hợp đồng thương mại', ARRAY['commercial contract review']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Tư vấn thủ tục cấp phép', ARRAY['licensing procedure advisory']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Quản lý rủi ro pháp lý doanh nghiệp', ARRAY['corporate legal risk management']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Soạn thảo điều lệ công ty', ARRAY['company charter drafting']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Đại diện làm việc với cơ quan nhà nước', ARRAY['government liaison']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Thẩm định pháp lý cho M&A', ARRAY['legal due diligence']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Hỗ trợ tranh tụng bảo vệ quyền lợi doanh nghiệp', ARRAY['litigation support']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Soạn thảo chính sách bảo mật dữ liệu', ARRAY['data privacy policy drafting']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Cập nhật quy định ngành', ARRAY['industry regulation tracking']),
  ((select id from public.industries where slug = 'nhan-su-phap-ly-phap-che'), 'hard', 'Tư vấn hợp đồng lao động nước ngoài', ARRAY['foreign labor contract advisory'])
on conflict do nothing;

-- dich-vu-khach-hang-cskh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Quản lý trung tâm liên hệ', ARRAY['contact center management']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Xử lý khách hàng giận dữ', ARRAY['de-escalation skills']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Xây dựng kịch bản trả lời mẫu', ARRAY['response script building']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Đào tạo tổng đài viên mới', ARRAY['new agent onboarding']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Giám sát chất lượng cuộc gọi', ARRAY['call quality monitoring']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Hỗ trợ khách hàng qua social media', ARRAY['social media customer support']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Quản lý dữ liệu phản hồi khách hàng', ARRAY['customer feedback data management']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Xây dựng FAQ tài liệu tự phục vụ', ARRAY['self-service faq building']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Xử lý yêu cầu hoàn tiền', ARRAY['refund request handling']),
  ((select id from public.industries where slug = 'dich-vu-khach-hang-cskh'), 'hard', 'Đo lường Customer Effort Score', ARRAY['ces measurement'])
on conflict do nothing;

-- thiet-ke-do-hoa
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế UI/UX chuyên sâu', ARRAY['advanced ui ux design']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế nhãn mác sản phẩm', ARRAY['label design']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Illustration số', ARRAY['digital illustration']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Infographic Design', ARRAY['thiết kế infographic']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế mascot nhân vật thương hiệu', ARRAY['brand mascot design']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế hệ thống nhận diện thương hiệu toàn diện', ARRAY['comprehensive brand identity system']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Prepress - Chuẩn bị file in ấn', ARRAY['print file preparation']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Adobe Lightroom', ARRAY['chỉnh sửa ảnh lightroom']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Thiết kế nội dung social media', ARRAY['social media graphic design']),
  ((select id from public.industries where slug = 'thiet-ke-do-hoa'), 'hard', 'Animation 2D cơ bản', ARRAY['basic 2d animation'])
on conflict do nothing;

-- thiet-ke-kien-truc-kien-truc
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế cảnh quan', ARRAY['landscape design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế quy hoạch tổng mặt bằng', ARRAY['master planning']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Phân tích kết cấu công trình', ARRAY['structural analysis']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Giám sát tác giả', ARRAY['design supervision on-site']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế công trình xanh', ARRAY['green building design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Twinmotion / Lumion rendering kiến trúc', ARRAY['architectural rendering']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Lập hồ sơ xin phép xây dựng', ARRAY['building permit documentation']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế nhà phố biệt thự', ARRAY['residential architecture design']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Thiết kế công trình công nghiệp', ARRAY['industrial architecture']),
  ((select id from public.industries where slug = 'thiet-ke-kien-truc-kien-truc'), 'hard', 'Phối hợp đa bộ môn kiến trúc kết cấu MEP', ARRAY['multidisciplinary coordination'])
on conflict do nothing;

-- thiet-ke-my-thuat
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Character Design', ARRAY['thiết kế nhân vật']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Storyboard', ARRAY['kịch bản hình ảnh']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Illustration sách truyện', ARRAY['book illustration']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Digital Art', ARRAY['nghệ thuật số']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Digital Painting', ARRAY['vẽ số']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Vẽ tranh truyền thần', ARRAY['portrait drawing']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Điêu khắc kỹ thuật số', ARRAY['digital sculpting', 'zbrush']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Thiết kế tranh tường Mural', ARRAY['mural design']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Nhiếp ảnh sản phẩm', ARRAY['product photography']),
  ((select id from public.industries where slug = 'thiet-ke-my-thuat'), 'hard', 'Chỉnh sửa ảnh chuyên sâu', ARRAY['advanced photo retouching'])
on conflict do nothing;

-- thiet-ke-noi-that
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Thiết kế nội thất văn phòng', ARRAY['office interior design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Thiết kế nội thất căn hộ', ARRAY['apartment interior design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Tư vấn phong thủy nội thất', ARRAY['feng shui consulting']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Lựa chọn ánh sáng nội thất', ARRAY['interior lighting design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Thiết kế nội thất thương mại', ARRAY['commercial interior design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Giám sát thi công nội thất', ARRAY['interior fit-out supervision']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Dự toán chi phí nội thất', ARRAY['interior costing']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Thiết kế đồ nội thất theo yêu cầu', ARRAY['custom furniture design']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Twinmotion nội thất', ARRAY['interior rendering']),
  ((select id from public.industries where slug = 'thiet-ke-noi-that'), 'hard', 'Phối hợp với nhà cung cấp vật liệu nội thất', ARRAY['material supplier coordination'])
on conflict do nothing;

-- khach-san-khach-san
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Quản lý doanh thu buồng phòng', ARRAY['room revenue management']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Đào tạo nhân viên lễ tân', ARRAY['front desk staff training']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Xử lý overbooking', ARRAY['overbooking handling']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Quản lý dịch vụ giặt ủi', ARRAY['laundry service management']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Kiểm soát chất lượng buồng phòng', ARRAY['room quality control']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Quản lý an ninh khách sạn', ARRAY['hotel security management']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Kỹ năng bán phòng qua điện thoại', ARRAY['phone room sales']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Sử dụng hệ thống booking OTA', ARRAY['booking.com', 'agoda', 'expedia']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Quản lý sự kiện tại khách sạn', ARRAY['hotel banquet management']),
  ((select id from public.industries where slug = 'khach-san-khach-san'), 'hard', 'Xử lý tình huống khẩn cấp khách sạn', ARRAY['hotel emergency handling'])
on conflict do nothing;

-- khach-san-du-lich-le-hanh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Thiết kế tour theo yêu cầu', ARRAY['custom tour design']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Điều hành tour', ARRAY['tour operations']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Quản lý đối tác lưu trú vận chuyển', ARRAY['accommodation transport partner management']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Sales tour du lịch', ARRAY['tour sales']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Kỹ năng thuyết minh du lịch', ARRAY['tour narration']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Xử lý sự cố trong tour', ARRAY['tour incident handling']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Am hiểu điểm đến du lịch', ARRAY['destination knowledge']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Quản lý ngân sách tour', ARRAY['tour budget management']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Xử lý bảo hiểm du lịch', ARRAY['travel insurance handling']),
  ((select id from public.industries where slug = 'khach-san-du-lich-le-hanh'), 'hard', 'Marketing du lịch', ARRAY['tourism marketing'])
on conflict do nothing;

-- khach-san-spa-lam-dep
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Trị liệu bằng đá nóng', ARRAY['hot stone therapy']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Chăm sóc móng chuyên sâu', ARRAY['advanced nail care']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Phun xăm thẩm mỹ', ARRAY['cosmetic tattooing', 'microblading']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Triệt lông công nghệ cao', ARRAY['laser hair removal']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Chăm sóc tóc chuyên sâu', ARRAY['advanced hair treatment']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Tư vấn gói dịch vụ spa', ARRAY['spa package consulting']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Vận hành máy soi da', ARRAY['skin analysis device operation']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Quản lý lịch hẹn khách spa', ARRAY['spa appointment management']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Kỹ thuật trang điểm cô dâu', ARRAY['bridal makeup']),
  ((select id from public.industries where slug = 'khach-san-spa-lam-dep'), 'hard', 'Vệ sinh khử trùng dụng cụ làm đẹp', ARRAY['beauty tool sterilization'])
on conflict do nothing;

-- khach-san-nha-hang-fb
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Quản lý chi phí nguyên vật liệu', ARRAY['food cost management']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Xây dựng thực đơn theo mùa', ARRAY['seasonal menu development']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Kỹ thuật trang trí món ăn', ARRAY['food plating']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Quản lý nhân sự bếp', ARRAY['kitchen staff management']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Kiểm soát định lượng nguyên liệu', ARRAY['portion control']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Sơ chế và bảo quản thực phẩm', ARRAY['food prep and storage']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Pha chế cocktail', ARRAY['cocktail mixing']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Latte Art / Pha chế cà phê', ARRAY['coffee brewing']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Quản lý order và giao hàng F&B', ARRAY['f&b order delivery management']),
  ((select id from public.industries where slug = 'khach-san-nha-hang-fb'), 'hard', 'Xử lý phàn nàn về món ăn', ARRAY['food complaint handling'])
on conflict do nothing;

-- y-te-duoc-y-te
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Chăm sóc bệnh nhân ngoại trú', ARRAY['outpatient care']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Chăm sóc sức khỏe bà mẹ trẻ em', ARRAY['maternal and child health care']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Phục hồi chức năng', ARRAY['rehabilitation']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Tiêm chủng', ARRAY['vaccination administration']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Quản lý phòng mổ', ARRAY['operating room management']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Chăm sóc người cao tuổi', ARRAY['elderly care']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Hỗ trợ gây mê hồi sức', ARRAY['anesthesia support']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Xét nghiệm sinh hóa', ARRAY['biochemical testing']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Dinh dưỡng lâm sàng', ARRAY['clinical nutrition']),
  ((select id from public.industries where slug = 'y-te-duoc-y-te'), 'hard', 'Quản lý chất lượng bệnh viện', ARRAY['hospital quality management'])
on conflict do nothing;

-- y-te-duoc-duoc-pham
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Quản lý chuỗi nhà thuốc', ARRAY['pharmacy chain management']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Bán lẻ dược phẩm', ARRAY['retail pharmacy sales']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Nghiên cứu phát triển thuốc mới', ARRAY['new drug r&d']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Quản lý xuất nhập khẩu dược phẩm', ARRAY['pharma import export management']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Đăng ký lưu hành sản phẩm dược', ARRAY['pharma regulatory affairs']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Tư vấn dược tại nhà thuốc', ARRAY['pharmacist consulting']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Marketing dược phẩm', ARRAY['pharma marketing']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Quản lý kho lạnh dược phẩm', ARRAY['cold chain pharma warehouse']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Đào tạo sản phẩm cho trình dược viên', ARRAY['product training for medical reps']),
  ((select id from public.industries where slug = 'y-te-duoc-duoc-pham'), 'hard', 'Theo dõi tác dụng phụ thuốc', ARRAY['pharmacovigilance'])
on conflict do nothing;

-- xay-dung-ky-su
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Quản lý chất lượng công trình theo tiêu chuẩn quốc tế', ARRAY['international qc standards']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Thiết kế hệ thống cấp thoát nước', ARRAY['water supply drainage design']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Thiết kế phòng cháy chữa cháy công trình', ARRAY['fire protection design']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'An toàn công trình cao tầng', ARRAY['high-rise construction safety']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Kỹ thuật nền móng', ARRAY['foundation engineering']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Thi công cầu đường', ARRAY['road and bridge construction']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Giám sát công trình thủy lợi', ARRAY['irrigation works supervision']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Quản lý hồ sơ thanh quyết toán', ARRAY['payment settlement documentation']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Sử dụng phần mềm Tekla / Etabs', ARRAY['tekla', 'etabs']),
  ((select id from public.industries where slug = 'xay-dung-ky-su'), 'hard', 'Lập biện pháp thi công', ARRAY['construction method statement'])
on conflict do nothing;

-- dien-dien-tu-dien-lanh
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Sửa chữa tủ lạnh tủ đông công nghiệp', ARRAY['industrial refrigeration repair']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Lắp đặt hệ thống điều hòa trung tâm', ARRAY['central ac installation']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Bảo trì hệ thống lạnh siêu thị', ARRAY['supermarket cold system maintenance']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Kỹ thuật hàn ống đồng gas lạnh', ARRAY['refrigerant piping brazing']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Vận hành hệ thống kho lạnh', ARRAY['cold storage system operation']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Xử lý sự cố hệ thống lạnh', ARRAY['refrigeration troubleshooting']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Tiết kiệm năng lượng hệ thống lạnh', ARRAY['energy-efficient cooling systems']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Lắp đặt điện dân dụng', ARRAY['residential electrical work']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Đọc bản vẽ điện lạnh', ARRAY['reading refrigeration schematics']),
  ((select id from public.industries where slug = 'dien-dien-tu-dien-lanh'), 'hard', 'Bảo trì máy phát điện', ARRAY['generator maintenance'])
on conflict do nothing;

-- dien-dien-tu-vien-thong-vt
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Triển khai hạ tầng cáp quang', ARRAY['fiber optic infrastructure deployment']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Vận hành trung tâm dữ liệu viễn thông', ARRAY['telecom data center operations']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Tối ưu hóa sóng di động', ARRAY['mobile network optimization']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Bảo trì tổng đài IP', ARRAY['ip pbx maintenance']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Kỹ thuật truyền dẫn', ARRAY['transmission engineering']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Lắp đặt thiết bị đầu cuối viễn thông', ARRAY['cpe installation']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Quản lý dự án viễn thông', ARRAY['telecom project management']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Đo kiểm chất lượng dịch vụ mạng', ARRAY['network qos testing']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', '5G Network Fundamentals', ARRAY['mạng 5g cơ bản']),
  ((select id from public.industries where slug = 'dien-dien-tu-vien-thong-vt'), 'hard', 'Hỗ trợ kỹ thuật khách hàng viễn thông', ARRAY['telecom technical support'])
on conflict do nothing;

-- bat-dong-san-moi-gioi
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Khai thác nguồn hàng bất động sản', ARRAY['property sourcing']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Marketing bất động sản online', ARRAY['online real estate marketing']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Tư vấn đầu tư bất động sản nghỉ dưỡng', ARRAY['resort real estate investment consulting']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Quản lý kênh Facebook Zalo bán BĐS', ARRAY['social media property sales']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Tổ chức sự kiện mở bán', ARRAY['sales launch event organizing']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Đàm phán giá với chủ nhà', ARRAY['negotiating with property owners']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Kỹ năng telesale bất động sản', ARRAY['real estate telesales']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Tư vấn cho thuê văn phòng mặt bằng', ARRAY['office retail leasing consulting']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Xây dựng data khách hàng đầu tư', ARRAY['investor database building']),
  ((select id from public.industries where slug = 'bat-dong-san-moi-gioi'), 'hard', 'Am hiểu quy hoạch khu vực', ARRAY['local zoning knowledge'])
on conflict do nothing;

-- co-khi-tu-dong-hoa
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Thiết kế hệ thống điều khiển tự động', ARRAY['automation control system design']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Lập trình vi điều khiển', ARRAY['microcontroller programming', 'arduino', 'stm32']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Robot công nghiệp ABB Kuka Fanuc', ARRAY['industrial robot programming']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Bảo trì hệ thống tự động hóa nhà máy', ARRAY['factory automation maintenance']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Tích hợp hệ thống SCADA-PLC', ARRAY['scada plc integration']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Hệ thống Vision công nghiệp', ARRAY['industrial vision system']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Điều khiển động cơ servo', ARRAY['servo motor control']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Thiết kế tủ điện điều khiển', ARRAY['control panel design']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'An toàn máy tự động hóa', ARRAY['machine safety']),
  ((select id from public.industries where slug = 'co-khi-tu-dong-hoa'), 'hard', 'Bảo trì dự đoán', ARRAY['predictive maintenance'])
on conflict do nothing;

-- co-khi-che-tao-co-khi
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Gia công tiện phay CNC', ARRAY['cnc turning milling']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Thiết kế khuôn dập', ARRAY['stamping die design']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Kiểm tra không phá hủy', ARRAY['ndt non-destructive testing']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Xử lý nhiệt kim loại', ARRAY['heat treatment']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Đúc kim loại', ARRAY['metal casting']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Lập trình gia công CAM', ARRAY['cam programming']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Đo lường 3D', ARRAY['cmm measurement']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Bảo trì máy CNC', ARRAY['cnc machine maintenance']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Chế tạo đồ gá', ARRAY['jig and fixture fabrication']),
  ((select id from public.industries where slug = 'co-khi-che-tao-co-khi'), 'hard', 'Quản lý sản xuất phân xưởng cơ khí', ARRAY['mechanical workshop production management'])
on conflict do nothing;

-- co-khi-o-to
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Sửa chữa hệ thống gầm ô tô', ARRAY['chassis repair']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Sửa chữa hệ thống điều hòa ô tô', ARRAY['automotive ac repair']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Đồng sơn ô tô', ARRAY['auto body and paint']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Sửa chữa xe máy', ARRAY['motorcycle repair']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Chăm sóc và detailing xe', ARRAY['car detailing']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Kiểm định an toàn kỹ thuật xe', ARRAY['vehicle safety inspection']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Tư vấn dịch vụ sửa chữa', ARRAY['service advisor skills']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Quản lý phụ tùng ô tô', ARRAY['auto parts management']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Lắp đặt phụ kiện ô tô', ARRAY['auto accessory installation']),
  ((select id from public.industries where slug = 'co-khi-o-to'), 'hard', 'Bảo dưỡng xe điện', ARRAY['ev maintenance'])
on conflict do nothing;

-- van-tai-logistics-kho-van
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Quản lý kho lạnh', ARRAY['cold chain warehousing']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Bố trí layout kho hàng', ARRAY['warehouse layout planning']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Vận hành xe nâng', ARRAY['forklift operation']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Quản lý kho thương mại điện tử', ARRAY['e-commerce fulfillment warehousing']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Kiểm soát chất lượng hàng lưu kho', ARRAY['warehouse quality control']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Xử lý hàng tồn kho chậm luân chuyển', ARRAY['slow-moving inventory handling']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Barcode RFID trong quản lý kho', ARRAY['barcode rfid inventory management']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Đóng gói và dán nhãn hàng hóa', ARRAY['packing and labeling']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'Quản lý nhân sự kho', ARRAY['warehouse staff management']),
  ((select id from public.industries where slug = 'van-tai-logistics-kho-van'), 'hard', 'An toàn lao động trong kho', ARRAY['warehouse safety'])
on conflict do nothing;

-- van-tai-giao-nhan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Điều phối shipper giao hàng', ARRAY['delivery dispatch coordination']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Quản lý đơn hàng COD', ARRAY['cod order management']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Vận tải hàng nguyên container và hàng ghép', ARRAY['fcl lcl transport']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Xử lý sự cố giao hàng trễ', ARRAY['late delivery issue handling']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Chăm sóc khách hàng vận chuyển', ARRAY['shipping customer service']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Tối ưu chi phí giao hàng chặng cuối', ARRAY['last-mile cost optimization']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Quản lý đội ngũ giao nhận', ARRAY['delivery team management']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Lập kế hoạch tuyến giao hàng hàng ngày', ARRAY['daily delivery route planning']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Sử dụng app quản lý vận chuyển', ARRAY['delivery management app usage']),
  ((select id from public.industries where slug = 'van-tai-giao-nhan'), 'hard', 'Đối soát công nợ vận chuyển', ARRAY['shipping payment reconciliation'])
on conflict do nothing;

-- van-tai-xuat-nhap-khau
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Khai báo hải quan điện tử', ARRAY['electronic customs declaration']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Đàm phán với hãng tàu forwarder', ARRAY['negotiating with shipping lines']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Quản lý hồ sơ xuất nhập khẩu', ARRAY['import export documentation management']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Kiểm tra chuyên ngành hàng nhập khẩu', ARRAY['specialized import inspection']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Tính thuế xuất nhập khẩu', ARRAY['import export tax calculation']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Vận đơn đường biển đường hàng không', ARRAY['sea air bill of lading']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Quản lý rủi ro thương mại quốc tế', ARRAY['international trade risk management']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Đàm phán hợp đồng ngoại thương', ARRAY['foreign trade contract negotiation']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Am hiểu quy tắc xuất xứ', ARRAY['rules of origin knowledge']),
  ((select id from public.industries where slug = 'van-tai-xuat-nhap-khau'), 'hard', 'Xử lý tranh chấp thương mại quốc tế', ARRAY['international trade dispute handling'])
on conflict do nothing;

-- san-xuat-qa-qc-qa-qc
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Đánh giá nhà cung cấp', ARRAY['supplier audit']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Kiểm tra kích thước bằng thước cặp panme', ARRAY['dimensional inspection tools']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Lập kế hoạch kiểm soát chất lượng', ARRAY['quality control planning']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Phân tích khiếu nại khách hàng về chất lượng', ARRAY['customer quality complaint analysis']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Đào tạo nhận thức chất lượng', ARRAY['quality awareness training']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Six Sigma Green Belt', ARRAY['six sigma']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Kiểm tra chất lượng bằng máy đo tự động', ARRAY['automated quality inspection']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Quản lý hồ sơ chất lượng ISO', ARRAY['iso quality records management']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Đánh giá năng lực đo lường', ARRAY['gauge r&r', 'msa']),
  ((select id from public.industries where slug = 'san-xuat-qa-qc-qa-qc'), 'hard', 'Thẩm định quy trình sản xuất mới', ARRAY['new process validation'])
on conflict do nothing;

-- san-xuat-thuc-pham
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Nghiên cứu phát triển sản phẩm thực phẩm mới', ARRAY['new food product development']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Kiểm soát chất lượng nguyên liệu đầu vào', ARRAY['raw material qc for food']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Vận hành dây chuyền chế biến thực phẩm', ARRAY['food processing line operation']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Đóng gói thực phẩm an toàn', ARRAY['safe food packaging']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Kiểm nghiệm vi sinh thực phẩm', ARRAY['food microbiological testing']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Chứng nhận Halal', ARRAY['halal certification']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Quản lý hạn sử dụng và truy xuất nguồn gốc', ARRAY['shelf-life and traceability management']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Công nghệ bảo quản thực phẩm', ARRAY['food preservation technology']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Quy trình sản xuất đồ uống có cồn', ARRAY['alcoholic beverage production']),
  ((select id from public.industries where slug = 'san-xuat-thuc-pham'), 'hard', 'Vệ sinh nhà máy thực phẩm', ARRAY['food plant sanitation'])
on conflict do nothing;

-- san-xuat-quan-ly
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Lập kế hoạch nhân sự sản xuất', ARRAY['production workforce planning']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Quản lý bảo trì thiết bị', ARRAY['equipment maintenance management']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Tối ưu chi phí sản xuất', ARRAY['production cost optimization']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Quản lý dữ liệu sản xuất theo thời gian thực', ARRAY['mes real-time production data']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Đào tạo công nhân sản xuất', ARRAY['production worker training']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Quản lý năng lượng nhà máy', ARRAY['factory energy management']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Xây dựng KPI sản xuất', ARRAY['production kpi setting']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Quản lý an toàn hóa chất trong sản xuất', ARRAY['production chemical safety']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Điều phối sản xuất đa dây chuyền', ARRAY['multi-line production coordination']),
  ((select id from public.industries where slug = 'san-xuat-quan-ly'), 'hard', 'Digital Manufacturing / Smart Factory', ARRAY['nhà máy thông minh'])
on conflict do nothing;

-- san-xuat-det-may
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Kiểm tra chất lượng thành phẩm may', ARRAY['finished garment qc']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Định mức nguyên phụ liệu', ARRAY['material consumption norms']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Thiết kế dây chuyền may', ARRAY['sewing line balancing']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Quản lý kho nguyên phụ liệu dệt may', ARRAY['textile material warehouse management']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Nhuộm và hoàn tất vải', ARRAY['dyeing and finishing']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Merchandising ngành may', ARRAY['garment merchandising']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Đàm phán đơn hàng FOB CMT', ARRAY['fob cmt order negotiation']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Kỹ thuật cắt vải công nghiệp', ARRAY['industrial fabric cutting']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Giám sát sản xuất giày da', ARRAY['footwear production supervision']),
  ((select id from public.industries where slug = 'san-xuat-det-may'), 'hard', 'Tuân thủ trách nhiệm xã hội WRAP BSCI', ARRAY['social compliance'])
on conflict do nothing;

-- san-xuat-my-pham
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Phát triển sản phẩm mỹ phẩm thiên nhiên', ARRAY['natural cosmetics product development']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Kiểm tra độ ổn định sản phẩm', ARRAY['product stability testing']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Phối hợp thử nghiệm dị ứng da', ARRAY['dermatological allergy testing coordination']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Quản lý chuỗi cung ứng nguyên liệu mỹ phẩm', ARRAY['cosmetic ingredient supply chain']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Thiết kế bao bì mỹ phẩm', ARRAY['cosmetic packaging design']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Tuân thủ ASEAN Cosmetic Directive', ARRAY['asean cosmetic directive compliance']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Marketing sản phẩm mỹ phẩm', ARRAY['cosmetics product marketing']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Vận hành dây chuyền chiết rót mỹ phẩm', ARRAY['cosmetics filling line operation']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Đánh giá cảm quan sản phẩm', ARRAY['sensory evaluation']),
  ((select id from public.industries where slug = 'san-xuat-my-pham'), 'hard', 'Đăng ký nhãn hiệu mỹ phẩm quốc tế', ARRAY['international cosmetic brand registration'])
on conflict do nothing;

-- san-xuat-nong-nghiep
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Quản lý dịch hại tổng hợp', ARRAY['integrated pest management']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Công nghệ tưới tiêu', ARRAY['irrigation technology']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Nuôi trồng thủy sản công nghệ cao', ARRAY['high-tech aquaculture']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Chọn giống cây trồng', ARRAY['crop breeding', 'seed selection']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Chăn nuôi gia súc gia cầm công nghiệp', ARRAY['industrial livestock poultry farming']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Chế biến sau thu hoạch', ARRAY['post-harvest processing']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Chứng nhận hữu cơ', ARRAY['organic certification']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Quản lý đất và dinh dưỡng cây trồng', ARRAY['soil and plant nutrition management']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Nông nghiệp bền vững', ARRAY['sustainable agriculture']),
  ((select id from public.industries where slug = 'san-xuat-nong-nghiep'), 'hard', 'Xuất khẩu nông sản', ARRAY['agricultural export'])
on conflict do nothing;

-- san-xuat-moi-truong
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Thiết kế hệ thống xử lý nước thải', ARRAY['wastewater treatment system design']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Quản lý chất thải nguy hại', ARRAY['hazardous waste management']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Kiểm toán năng lượng', ARRAY['energy audit']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Quan trắc khí thải tự động', ARRAY['automated emission monitoring']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Lập báo cáo phát triển bền vững ESG', ARRAY['sustainability esg reporting']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Xử lý ô nhiễm đất', ARRAY['soil remediation']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Quản lý carbon giảm phát thải', ARRAY['carbon management']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Tái chế chất thải công nghiệp', ARRAY['industrial waste recycling']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Ứng phó sự cố môi trường', ARRAY['environmental incident response']),
  ((select id from public.industries where slug = 'san-xuat-moi-truong'), 'hard', 'Tư vấn giấy phép môi trường', ARRAY['environmental permit consulting'])
on conflict do nothing;

-- giao-duc-giang-day
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Giảng dạy STEAM', ARRAY['steam teaching']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Xây dựng ngân hàng câu hỏi', ARRAY['question bank development']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Tư vấn du học', ARRAY['study abroad consulting']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Đào tạo kỹ năng thế kỷ 21', ARRAY['21st century skills training']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Giảng dạy song ngữ', ARRAY['bilingual teaching']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Quản lý học viên trung tâm', ARRAY['learner center management']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Xây dựng chương trình khung', ARRAY['framework curriculum design']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Coaching thi cử', ARRAY['test-prep coaching']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Đào tạo doanh nghiệp', ARRAY['corporate training delivery']),
  ((select id from public.industries where slug = 'giao-duc-giang-day'), 'hard', 'Đánh giá cải tiến chương trình đào tạo', ARRAY['training program evaluation'])
on conflict do nothing;

-- lao-dong-pho-thong-lai-xe
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Lái xe công nghệ', ARRAY['grab', 'be driver']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Lái xe taxi', ARRAY['taxi driving']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Vận chuyển hàng hóa nội thành', ARRAY['intra-city cargo delivery']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Xử lý sự cố trên đường', ARRAY['roadside incident handling']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Chở khách theo hợp đồng', ARRAY['contract passenger transport']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Sử dụng ứng dụng điều hướng', ARRAY['navigation app usage']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Kiểm tra xe trước khi vận hành', ARRAY['pre-trip vehicle inspection']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Giao hàng liên tỉnh', ARRAY['interprovincial delivery']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Chăm sóc khách hàng khi lái xe dịch vụ', ARRAY['passenger service etiquette']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-lai-xe'), 'hard', 'Sơ cứu tai nạn giao thông cơ bản', ARRAY['basic traffic accident first aid'])
on conflict do nothing;

-- lao-dong-pho-thong-cong-nhan
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Vận hành máy đóng gói', ARRAY['packaging machine operation']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Bốc xếp bằng xe nâng', ARRAY['forklift loading']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Làm việc trong môi trường nhiệt độ khắc nghiệt', ARRAY['extreme temperature work']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Lắp ráp linh kiện thủ công', ARRAY['manual component assembly']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Vệ sinh máy móc sau ca', ARRAY['post-shift machine cleaning']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Ghi chép sản lượng', ARRAY['output recording']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Tuân thủ quy trình 5S tại xưởng', ARRAY['5s compliance on shop floor']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Phân loại và đóng gói hàng hóa', ARRAY['sorting and packing']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Vận hành băng chuyền', ARRAY['conveyor operation']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-cong-nhan'), 'hard', 'Kiểm tra lỗi sản phẩm bằng mắt', ARRAY['visual defect inspection'])
on conflict do nothing;

-- lao-dong-pho-thong-tap-vu
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Giặt ủi quần áo', ARRAY['laundry and ironing']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Chăm sóc cây cảnh', ARRAY['plant and garden care']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Sắp xếp đồ đạc gọn gàng', ARRAY['tidying and organizing']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Vệ sinh kính cửa sổ tòa nhà', ARRAY['window glass cleaning']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Đi chợ chuẩn bị bữa ăn', ARRAY['grocery shopping and meal prep']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Vệ sinh nhà bếp công nghiệp', ARRAY['industrial kitchen cleaning']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Sử dụng máy hút bụi máy chà sàn', ARRAY['vacuum and floor scrubber operation']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Trông trẻ hỗ trợ chăm sóc người già', ARRAY['childcare eldercare support']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Thu gom và phân loại rác', ARRAY['waste collection and sorting']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-tap-vu'), 'hard', 'Đảm bảo an toàn khi dùng hóa chất tẩy rửa', ARRAY['safe chemical handling'])
on conflict do nothing;

-- lao-dong-pho-thong-bao-ve
insert into public.skills (industry_id, skill_type, name, aliases) values
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Vận hành thiết bị an ninh CCTV', ARRAY['security equipment operation']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Bảo vệ mục tiêu cố định', ARRAY['fixed-post security']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Bảo vệ sự kiện đám đông', ARRAY['event crowd security']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Kiểm soát phòng cháy chữa cháy', ARRAY['fire safety control']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Ghi chép sổ giao ca bảo vệ', ARRAY['security shift handover logging']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Xử lý người lạ xâm nhập', ARRAY['intruder handling']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Tuần tra khu vực ban đêm', ARRAY['night patrol']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Hộ tống áp tải tài sản', ARRAY['escort asset protection']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Kỹ năng sơ cứu khẩn cấp', ARRAY['emergency first aid']),
  ((select id from public.industries where slug = 'lao-dong-pho-thong-bao-ve'), 'hard', 'Phối hợp với công an địa phương', ARRAY['coordination with local police'])
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════
-- KIEM TRA SAU KHI CHAY: tong so skill theo tung nganh
-- ══════════════════════════════════════════════════════════════
select i.slug, i.level, i.name, count(s.id) as so_skill
from public.industries i
left join public.skills s on s.industry_id = i.id
group by i.slug, i.level, i.name
order by i.level, so_skill;
