# Web Thiện Nguyện - Frontend

Frontend của hệ thống Web hỗ trợ kết nối và quản lý hoạt động thiện nguyện trong cộng đồng.

## 🛠️ Công nghệ sử dụng

- **HTML5** - Cấu trúc trang web
- **Tailwind CSS** - Styling và responsive design
- **Vanilla JavaScript** - Logic phía client
- **Vite** - Build tool
- **Nginx** - Web server trong Docker

## 📁 Cấu trúc thư mục

```
frontend/
├── public/
│   ├── css/
│   │   ├── tailwind.css       # Tailwind source
│   │   └── output.css          # Compiled CSS
│   ├── js/
│   │   ├── main.js             # Core utilities
│   │   └── *.js                # Page-specific scripts
│   └── images/
├── views/
│   ├── index.html              # Trang chủ
│   ├── login.html              # Đăng nhập
│   ├── register.html           # Đăng ký
│   ├── chien-dich.html         # Danh sách chiến dịch
│   ├── chi-tiet-chien-dich.html
│   ├── dashboard-admin.html
│   ├── dashboard-to-chuc.html
│   └── profile.html
├── Dockerfile
├── nginx.conf
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## 🚀 Cài đặt và chạy

### Development

```bash
# Cài đặt dependencies
npm install

# Chạy dev server với Vite
npm run dev

# Build Tailwind CSS (watch mode)
npm run build:css
```

### Production Build

```bash
# Build production
npm run build

# Preview production build
npm run preview
```

### Chạy với Docker

```bash
# Build Docker image
docker build -t webthiennguyen-frontend .

# Chạy container
docker run -p 3000:80 webthiennguyen-frontend
```

## 🎨 Tính năng

### Trang công khai
- ✅ Trang chủ với chiến dịch nổi bật
- ✅ Danh sách chiến dịch (filter, search)
- ✅ Chi tiết chiến dịch
- ✅ Đăng nhập / Đăng ký

### Dashboard Admin
- Quản lý người dùng
- Quản lý tổ chức
- Quản lý chiến dịch
- Duyệt chiến dịch
- Thống kê tổng quan

### Dashboard Tổ chức
- Tạo và quản lý chiến dịch
- Quản lý tình nguyện viên
- Quản lý quyên góp
- Tạo báo cáo

### Profile (Tình nguyện viên / Mạnh thường quân)
- Xem lịch sử tham gia
- Xem lịch sử quyên góp
- Cập nhật thông tin cá nhân

## 🔧 Configuration

### API Endpoint

Cấu hình API endpoint trong `public/js/main.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### Tailwind CSS

Tùy chỉnh theme trong `tailwind.config.js`

## 📝 Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run build:css` - Build Tailwind CSS

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

MIT
