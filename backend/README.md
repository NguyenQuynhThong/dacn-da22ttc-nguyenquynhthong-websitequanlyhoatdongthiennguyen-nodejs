# Web Thiện Nguyện - Backend API

Backend API cho hệ thống quản lý thiện nguyện được xây dựng với Node.js, Express và MySQL.

## 🚀 Công nghệ sử dụng

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **CORS**: cors middleware

## 📁 Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/          # Cấu hình database và khởi tạo
│   │   ├── database.js  # Kết nối MySQL pool
│   │   └── init.sql     # Script tạo bảng và dữ liệu mẫu
│   ├── controllers/     # Xử lý logic nghiệp vụ
│   │   └── authController.js
│   ├── models/          # Định nghĩa schema (TODO)
│   ├── routes/          # Định tuyến API endpoints
│   │   └── authRoutes.js
│   ├── middlewares/     # Xác thực và phân quyền
│   │   └── auth.js
│   ├── utils/           # Hàm tiện ích (TODO)
│   ├── app.js           # Khởi tạo Express app
│   └── server.js        # Entry point
├── .env                 # Biến môi trường (local)
├── .env.example         # Mẫu biến môi trường
├── package.json
├── Dockerfile
└── README.md
```

## 🛠️ Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật thông tin database trong `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=web_thien_nguyen
DB_PORT=3306

JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development

CLIENT_URL=http://localhost:3000
```

### 3. Khởi tạo database

Chạy script SQL để tạo database và bảng:

```bash
mysql -u root -p < src/config/init.sql
```

Hoặc import trực tiếp trong MySQL Workbench/phpMyAdmin.

### 4. Chạy server

**Development mode (với nodemon):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 📡 API Endpoints

### Authentication

#### 1. Đăng ký tài khoản

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "mat_khau": "password123",
  "ten_day_du": "Nguyễn Văn A",
  "so_dien_thoai": "0912345678",
  "dia_chi": "Hà Nội",
  "vai_tro": "tinh_nguyen_vien"
}
```

**Vai trò (vai_tro):**
- `admin` - Quản trị viên
- `to_chuc` - Tổ chức
- `tinh_nguyen_vien` - Tình nguyện viên (mặc định)
- `nha_hao_tam` - Nhà hảo tâm

#### 2. Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "mat_khau": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "ten_day_du": "Nguyễn Văn A",
      "vai_tro": "tinh_nguyen_vien"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Lấy thông tin người dùng hiện tại

```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### 4. Cập nhật thông tin

```http
PUT /api/auth/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "ten_day_du": "Nguyễn Văn B",
  "so_dien_thoai": "0987654321",
  "dia_chi": "TP Hồ Chí Minh"
}
```

#### 5. Đổi mật khẩu

```http
PUT /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "mat_khau_cu": "password123",
  "mat_khau_moi": "newpassword456"
}
```

## 🔐 Tài khoản mẫu

### Admin
- Email: `admin@webthiennguyen.com` | Password: `password123`
- Email: `admin2@webthiennguyen.com` | Password: `password123`

### Tổ chức
- Email: `tochuc1@gmail.com` | Password: `password123`
- Email: `tochuc2@gmail.com` | Password: `password123`
- Email: `tochuc3@gmail.com` | Password: `password123`

### Tình nguyện viên
- Email: `tnv1@gmail.com` | Password: `password123`
- Email: `tnv2@gmail.com` | Password: `password123`
- Email: `tnv3@gmail.com` | Password: `password123`
- Email: `tnv4@gmail.com` | Password: `password123`
- Email: `tnv5@gmail.com` | Password: `password123`

### Nhà hảo tâm
- Email: `donor1@gmail.com` | Password: `password123`
- Email: `donor2@gmail.com` | Password: `password123`
- Email: `donor3@gmail.com` | Password: `password123`

## 🐳 Docker

### Build image

```bash
docker build -t web-thien-nguyen-backend .
```

### Chạy container

```bash
docker run -d \
  --name backend \
  -p 5000:5000 \
  --env-file .env \
  web-thien-nguyen-backend
```

## 🗄️ Database Schema

Hệ thống sử dụng 9 bảng chính:

1. **NguoiDung** - Quản lý người dùng
2. **ToChuc** - Thông tin tổ chức
3. **ChienDich** - Chiến dịch thiện nguyện
4. **ThamGia** - Tham gia chiến dịch
5. **QuyenGop** - Quyên góp
6. **HienVat** - Hiện vật quyên góp
7. **BaoCao** - Báo cáo vi phạm
8. **BinhLuan** - Bình luận
9. **ThongBao** - Thông báo

## 🔒 Bảo mật

- Mật khẩu được hash với bcrypt (salt rounds = 10)
- JWT token có thời gian hết hạn (mặc định 7 ngày)
- CORS được cấu hình cho frontend
- Input validation với express-validator
- Protected routes với middleware xác thực

## 📝 TODO

- [ ] Thêm API cho quản lý chiến dịch
- [ ] Thêm API cho quyên góp
- [ ] Thêm API cho tổ chức
- [ ] Thêm API cho admin
- [ ] Upload file/hình ảnh
- [ ] Email service (gửi thông báo)
- [ ] Rate limiting
- [ ] Logging system
- [ ] Unit tests
- [ ] API documentation (Swagger)

## 📞 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trong repository.
