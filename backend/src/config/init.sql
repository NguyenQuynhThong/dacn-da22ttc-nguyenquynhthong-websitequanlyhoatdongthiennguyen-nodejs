-- ================================================
-- TẠO DATABASE
-- ================================================
CREATE DATABASE IF NOT EXISTS thiennguyen_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE thiennguyen_db;

-- ============================================
-- XÓA CÁC BẢNG CŨ (nếu tồn tại)
-- ============================================
DROP TABLE IF EXISTS ThongBao;
DROP TABLE IF EXISTS BinhLuan;
DROP TABLE IF EXISTS BaoCao;
DROP TABLE IF EXISTS HienVat;
DROP TABLE IF EXISTS QuyenGop;
DROP TABLE IF EXISTS ThamGia;
DROP TABLE IF EXISTS ChienDich;
DROP TABLE IF EXISTS ToChuc;
DROP TABLE IF EXISTS NguoiDung;

-- ============================================
-- TẠO CÁC BẢNG
-- ============================================

-- 1. BẢNG NGƯỜI DÙNG
-- ================================================
CREATE TABLE NguoiDung (
user_id INT AUTO_INCREMENT PRIMARY KEY,
ho_ten VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
mat_khau VARCHAR(255) NOT NULL,
so_dien_thoai VARCHAR(20),
vai_tro ENUM('admin', 'to_chuc', 'tinh_nguyen_vien', 'manh_thuong_quan') NOT NULL DEFAULT 'tinh_nguyen_vien',
trang_thai ENUM('active','inactive','banned') DEFAULT 'active',
ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 2. BẢNG TỔ CHỨC
-- ================================================
CREATE TABLE ToChuc (
to_chuc_id INT AUTO_INCREMENT PRIMARY KEY,
ten_to_chuc VARCHAR(150) NOT NULL,
mo_ta TEXT,
dia_chi VARCHAR(255),
dien_thoai VARCHAR(50),
dai_dien_id INT,
ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (dai_dien_id) REFERENCES NguoiDung(user_id)
);

-- ================================================
-- 3. BẢNG CHIẾN DỊCH
-- ================================================
CREATE TABLE ChienDich (
chien_dich_id INT AUTO_INCREMENT PRIMARY KEY,
to_chuc_id INT NOT NULL,
ten_chien_dich VARCHAR(200) NOT NULL,
mo_ta TEXT,
ngay_bat_dau DATE,
ngay_ket_thuc DATE,
muc_tieu_tien DECIMAL(15,2),
muc_tieu_hien_vat TEXT,
trang_thai ENUM('cho_duyet','dang_dien_ra','ket_thuc','bi_huy') DEFAULT 'cho_duyet',
ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (to_chuc_id) REFERENCES ToChuc(to_chuc_id)
);

-- ================================================
-- 4. BẢNG TÌNH NGUYỆN VIÊN THAM GIA
-- ================================================
CREATE TABLE ThamGia (
tham_gia_id INT AUTO_INCREMENT PRIMARY KEY,
chien_dich_id INT NOT NULL,
user_id INT NOT NULL,
trang_thai ENUM('cho_duyet','duyet','tu_choi','huy') DEFAULT 'cho_duyet',
ngay_tham_gia DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (chien_dich_id) REFERENCES ChienDich(chien_dich_id),
FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id)
);

-- ================================================
-- 5. BẢNG QUYÊN GÓP TIỀN
-- ================================================
CREATE TABLE QuyenGop (
quyen_gop_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
chien_dich_id INT NOT NULL,
so_tien DECIMAL(15,2) NOT NULL,
phuong_thuc ENUM('tien_mat','chuyen_khoan','vi_dien_tu') DEFAULT 'chuyen_khoan',
ngay_gop DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id),
FOREIGN KEY (chien_dich_id) REFERENCES ChienDich(chien_dich_id)
);

-- ================================================
-- 6. BẢNG QUYÊN GÓP HIỆN VẬT
-- ================================================
CREATE TABLE HienVat (
hien_vat_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
chien_dich_id INT NOT NULL,
ten_hien_vat VARCHAR(200) NOT NULL,
so_luong INT DEFAULT 1,
mo_ta TEXT,
ngay_gop DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id),
FOREIGN KEY (chien_dich_id) REFERENCES ChienDich(chien_dich_id)
);

-- ================================================
-- 7. BẢNG BÁO CÁO CHIẾN DỊCH
-- ================================================
CREATE TABLE BaoCao (
bao_cao_id INT AUTO_INCREMENT PRIMARY KEY,
chien_dich_id INT NOT NULL,
to_chuc_id INT NOT NULL,
noi_dung TEXT NOT NULL,
ngay_bao_cao DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (chien_dich_id) REFERENCES ChienDich(chien_dich_id),
FOREIGN KEY (to_chuc_id) REFERENCES ToChuc(to_chuc_id)
);

-- ================================================
-- 8. BẢNG BÌNH LUẬN
-- ================================================
CREATE TABLE BinhLuan (
binh_luan_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
chien_dich_id INT NOT NULL,
noi_dung TEXT NOT NULL,
ngay_binh_luan DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id),
FOREIGN KEY (chien_dich_id) REFERENCES ChienDich(chien_dich_id)
);

-- ================================================
-- 9. BẢNG THÔNG BÁO
-- ================================================
CREATE TABLE ThongBao (
thong_bao_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NULL,
tieu_de VARCHAR(200),
noi_dung TEXT,
loai ENUM('he_thong','chien_dich','ca_nhan') DEFAULT 'he_thong',
ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id)
);

-- ============================================
-- THÊM DỮ LIỆU MẪU
-- ============================================

-- Mật khẩu mặc định: password123
-- Hash bcrypt: $2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq

-- 1. TẠO TÀI KHOẢN NGƯỜI DÙNG
-- ================================================
INSERT INTO NguoiDung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai) VALUES
-- Admin
('Quản trị viên', 'admin@webthiennguyen.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0901234567', 'admin', 'active'),
('Admin Phụ', 'admin2@webthiennguyen.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0901234568', 'admin', 'active'),

-- Tổ chức
('Quỹ Vì Trẻ Em Việt Nam', 'tochuc1@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0912345678', 'to_chuc', 'active'),
('Hội Chữ Thập Đỏ TP.HCM', 'tochuc2@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0923456789', 'to_chuc', 'active'),
('Tổ chức Xanh Môi Trường', 'tochuc3@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0934567890', 'to_chuc', 'active'),

-- Tình nguyện viên
('Nguyễn Văn An', 'tnv1@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0945678901', 'tinh_nguyen_vien', 'active'),
('Trần Thị Bình', 'tnv2@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0956789012', 'tinh_nguyen_vien', 'active'),
('Lê Hoàng Cường', 'tnv3@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0967890123', 'tinh_nguyen_vien', 'active'),
('Phạm Thị Diễm', 'tnv4@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0978901234', 'tinh_nguyen_vien', 'active'),
('Hoàng Văn Em', 'tnv5@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0989012345', 'tinh_nguyen_vien', 'active'),

-- Mạnh thường quân
('Võ Thị Hoa', 'donor1@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0990123456', 'manh_thuong_quan', 'active'),
('Đặng Văn Khải', 'donor2@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0901234560', 'manh_thuong_quan', 'active'),
('Bùi Thị Lan', 'donor3@gmail.com', '$2a$10$b9KMWcPtG7hahdOXuzffGeAlRoBD.n6FyTZ9BYIjy4YfhaJ8ofBvq', '0912345670', 'manh_thuong_quan', 'active');

-- 2. TẠO TỔ CHỨC
-- ================================================
INSERT INTO ToChuc (ten_to_chuc, mo_ta, dia_chi, dien_thoai, dai_dien_id)
SELECT 'Quỹ Vì Trẻ Em Việt Nam', 'Tổ chức phi lợi nhuận hoạt động vì quyền lợi trẻ em', 'Số 12, Đường Láng, Đống Đa, Hà Nội', '0912345678', user_id
FROM NguoiDung WHERE email = 'tochuc1@gmail.com';

INSERT INTO ToChuc (ten_to_chuc, mo_ta, dia_chi, dien_thoai, dai_dien_id)
SELECT 'Hội Chữ Thập Đỏ TP.HCM', 'Tổ chức nhân đạo hoạt động trong lĩnh vực y tế và cứu trợ', 'Số 201, Nguyễn Thị Minh Khai, Quận 3, TP Hồ Chí Minh', '0923456789', user_id
FROM NguoiDung WHERE email = 'tochuc2@gmail.com';

INSERT INTO ToChuc (ten_to_chuc, mo_ta, dia_chi, dien_thoai, dai_dien_id)
SELECT 'Tổ chức Xanh Môi Trường', 'Bảo vệ môi trường và phát triển bền vững', 'Số 45, Trần Phú, Hải Châu, Đà Nẵng', '0934567890', user_id
FROM NguoiDung WHERE email = 'tochuc3@gmail.com';

-- 3. TẠO CHIẾN DỊCH
-- ================================================
INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Tiếp sức đến trường 2025', 
       'Hỗ trợ học phí và dụng cụ học tập cho trẻ em vùng cao. Chiến dịch nhằm giúp các em học sinh có hoàn cảnh khó khăn tại các tỉnh miền núi phía Bắc có thể tiếp tục việc học tập.',
       '2025-01-15', 
       '2025-06-30', 
       500000000.00,
       '200 bộ đồng phục, 500 quyển vở, 300 cặp sách',
       'dang_dien_ra'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc1@gmail.com';

INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Xây dựng thư viện tình thương', 
       'Xây dựng thư viện cho các trường học vùng sâu vùng xa. Mục tiêu xây dựng 5 thư viện tại các trường học ở Tây Nguyên.',
       '2025-02-01', 
       '2025-12-31', 
       300000000.00,
       '5000 quyển sách, 100 bộ kệ sách, 50 bộ bàn ghế đọc sách',
       'dang_dien_ra'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc1@gmail.com';

INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Chăm sóc sức khỏe cộng đồng', 
       'Khám bệnh miễn phí và cấp thuốc cho người nghèo tại TP Hồ Chí Minh. Chương trình khám sàng lọc các bệnh mãn tính và tư vấn sức khỏe.',
       '2025-03-01', 
       '2025-05-31', 
       200000000.00,
       'Thuốc men, thiết bị y tế, vật tư y tế',
       'dang_dien_ra'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc2@gmail.com';

INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Cứu trợ lũ lụt miền Trung', 
       'Hỗ trợ khẩn cấp cho người dân bị ảnh hưởng bởi lũ lụt tại các tỉnh miền Trung. Cung cấp lương thực, nhu yếu phẩm và hỗ trợ tái thiết nhà cửa.',
       '2024-10-01', 
       '2024-12-31', 
       1000000000.00,
       'Gạo, mì tôm, nước uống, chăn màn, quần áo',
       'ket_thuc'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc2@gmail.com';

INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Trồng rừng xanh bảo vệ môi trường', 
       'Trồng cây xanh và phục hồi rừng ngập mặn tại Cà Mau, Bạc Liêu. Chiến dịch nhằm bảo vệ hệ sinh thái ven biển và giảm thiểu tác động của biến đổi khí hậu.',
       '2025-04-01', 
       '2025-08-31', 
       150000000.00,
       '50000 cây giống, dụng cụ làm vườn',
       'dang_dien_ra'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc3@gmail.com';

INSERT INTO ChienDich (to_chuc_id, ten_chien_dich, mo_ta, ngay_bat_dau, ngay_ket_thuc, muc_tieu_tien, muc_tieu_hien_vat, trang_thai)
SELECT tc.to_chuc_id, 
       'Dọn rác bãi biển', 
       'Chiến dịch làm sạch bãi biển và nâng cao nhận thức môi trường tại Đà Nẵng, Nha Trang. Tổ chức các hoạt động thu gom rác thải nhựa và tuyên truyền bảo vệ biển.',
       '2025-06-15', 
       '2025-07-15', 
       50000000.00,
       'Găng tay, túi rác, dụng cụ nhặt rác',
       'cho_duyet'
FROM ToChuc tc 
INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id 
WHERE nd.email = 'tochuc3@gmail.com';

-- ============================================
-- THÔNG TIN ĐĂNG NHẬP MẪU
-- ============================================
-- 
-- ADMIN:
--   Email: admin@webthiennguyen.com | Mật khẩu: password123
--   Email: admin2@webthiennguyen.com | Mật khẩu: password123
--
-- TỔ CHỨC:
--   Email: tochuc1@gmail.com | Mật khẩu: password123
--   Email: tochuc2@gmail.com | Mật khẩu: password123
--   Email: tochuc3@gmail.com | Mật khẩu: password123
--
-- TÌNH NGUYỆN VIÊN:
--   Email: tnv1@gmail.com | Mật khẩu: password123
--   Email: tnv2@gmail.com | Mật khẩu: password123
--   Email: tnv3@gmail.com | Mật khẩu: password123
--   Email: tnv4@gmail.com | Mật khẩu: password123
--   Email: tnv5@gmail.com | Mật khẩu: password123
--
-- MẠNH THƯỜNG QUÂN:
--   Email: donor1@gmail.com | Mật khẩu: password123
--   Email: donor2@gmail.com | Mật khẩu: password123
--   Email: donor3@gmail.com | Mật khẩu: password123
--
-- ============================================



