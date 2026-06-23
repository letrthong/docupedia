# Tài liệu Hệ thống Docupedia

Hệ thống quản lý tài liệu thông minh với React + Flask.

**Version:** v1.1.0 • Build 2026-06-23-A

## Yêu cầu hệ thống
- Docker & Docker Compose
- Linux/macOS hoặc môi trường hỗ trợ Bash shell

## Khởi chạy nhanh

```bash
chmod +x start_docker.sh
./start_docker.sh
```

**URL:** http://localhost:5000  
**Login:** admin / admin

## Tính năng chính

### 1. Quản lý Project
- Tạo/sửa/xóa project
- Phân quyền user khi tạo project (View/Edit/Delete)
- **Quản lý dự án** - Admin có thể quản lý tất cả projects và permissions
- Admin có full quyền tất cả project
- **Mặc định không có dữ liệu mẫu** - project mới hoàn toàn trống

### 2. Quản lý Tài liệu
- Cấu trúc thư mục dạng tree (TreeView) tối ưu hóa giao diện.
- Rich-text editor (Quill) với nhiều tính năng nâng cao:
  - **View/Edit mode**: Mặc định ở chế độ xem, click "Chỉnh sửa" để bắt đầu chỉnh sửa tài liệu.
  - **Chèn Icon/Emoji**: Bộ chọn [IconPicker](file:///d:/code/docupedia/src-react/components/documents/IconPicker.jsx) tiện lợi tích hợp sẵn nhiều phân mục và thanh tìm kiếm tiện lợi.
  - **Thanh trạng thái (Status Bar)**: Thống kê số từ, số ký tự thời gian thực ở góc dưới trình soạn thảo.
  - **Chèn nhanh ngày/giờ**: Nút chèn ngày trên thanh công cụ và phím tắt mở rộng (`/today`, `/now`, `/time`, `/date`).
  - **Nút Copy mã nguồn**: Nút Copy nổi tự động hiển thị khi rê chuột vào khối Code Block (`pre.ql-syntax`) ở chế độ View mode.
  - **Định dạng liên kết (Web link)**: Tự động hiển thị liên kết màu xanh dương, gạch chân và in nghiêng chuẩn web.
- Tự động lưu (Auto-save) sau khoảng thời gian tùy chọn (mặc định 3 giây).
- Xuất bản tài liệu dưới định dạng HTML hoặc văn bản TXT.

### 3. Quản lý User (Admin)
- Tạo/sửa/xóa user
- Phân quyền theo project
- Đổi role (admin/user)

### 4. UI/UX
- Dark/Light mode
- Click logo → về trang chủ
- Responsive layout
- Compact tree view

## Công nghệ

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React-Quill |
| Backend | Flask, PyJWT, bcrypt |
| Database | JSON files (data/) |
| Deploy | Docker |

## Cấu trúc thư mục

```
docupedia/
├── src/                  # Flask backend
│   ├── app.py           # Entry point
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── middleware/      # Auth middleware
├── src-react/           # React frontend
│   ├── pages/           # Page components
│   ├── components/      # UI components
│   ├── contexts/        # React contexts
│   └── api/             # API client
├── data/                # JSON database
├── Dockerfile
├── docker-compose.yml
└── start_docker.sh
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/logout` - Đăng xuất
- `GET /api/v1/auth/me` - Thông tin user

### Projects
- `GET /api/v1/projects` - Danh sách projects
- `POST /api/v1/projects` - Tạo project (Admin)
- `GET /api/v1/projects/:id` - Chi tiết project
- `GET /api/v1/projects/:id/permissions` - Quyền truy cập
- `POST /api/v1/projects/:id/permissions` - Thêm quyền

### Documents
- `GET /api/v1/projects/:id/documents` - Danh sách tài liệu
- `POST /api/v1/projects/:id/documents` - Tạo tài liệu
- `PUT /api/v1/projects/:id/documents/:docId` - Cập nhật
- `DELETE /api/v1/projects/:id/documents/:docId` - Xóa

## Phân quyền

| Quyền | Mô tả |
|-------|-------|
| `view` | Xem tài liệu |
| `edit` | Chỉnh sửa tài liệu |
| `delete` | Xóa tài liệu |
| `create` | Tạo tài liệu/thư mục mới |
| `manage` | Quản lý project & permissions |

**Admin:** Có tất cả quyền trên mọi project.

## UI Design

Premium theme với màu chủ đạo **xanh ngọc bích (Emerald)**:
- Primary color: Emerald (#10b981, emerald-500)
- Secondary: Teal cho gradients
- Neutral palette: Slate (slate-50 → slate-950)
- Accent: Amber cho folders, Rose cho danger
- Rounded-xl/2xl cards
- Icon decorations (Lucide React)
- Dark mode support
- Responsive layout

## Troubleshooting

### Build không cập nhật UI mới
Script đã được cấu hình với `--build-arg CACHEBUST=$(date +%s)` để invalidate cache mỗi lần build.

### Xem logs
```bash
docker compose logs -f
```

### Dừng container
```bash
docker compose down
```

### Reset data
```bash
rm -rf data/*
./start_docker.sh
```

## Changelog

### v1.1.0 (2026-06-23)
- ✅ **Bộ chọn Icon/Emoji**: Tích hợp [IconPicker](file:///d:/code/docupedia/src-react/components/documents/IconPicker.jsx) tiện lợi cho tài liệu.
- ✅ **Thanh trạng thái**: Thống kê số từ và số ký tự động của tài liệu thực tế.
- ✅ **Chèn nhanh ngày/giờ**: Nút calendar chèn thời gian trên thanh công cụ và phím tắt tự động mở rộng (`/today`, `/now`, `/time`, `/date`).
- ✅ **Copy Code nhanh**: Thêm nút copy nổi tiện dụng cho các khối mã nguồn ở chế độ Xem.
- ✅ **Web Link Styles**: Tự động hiển thị liên kết màu xanh dương, gạch chân và in nghiêng chuẩn web.

### v1.0.9 (2026-06-03)
- ✅ **Lazy Loading** - Pages được load theo yêu cầu
- ✅ Initial loader animation khi khởi động
- ✅ Non-blocking font loading
- ✅ Tối ưu performance cho SPA

### v1.0.8 (2026-06-02)
- ✅ Đổi màu chủ đạo sang **Emerald** (xanh ngọc bích)
- ✅ Xóa hint tài khoản mặc định khỏi login UI

### v1.0.7 (2026-06-02)
- ✅ Thêm trang **Quản lý dự án** cho admin
- ✅ Quản lý permissions trực tiếp từ danh sách project

### v1.0.6 (2026-06-02)
- ✅ **View/Edit mode** - Tài liệu mở mặc định ở chế độ xem
- ✅ Nút "Chỉnh sửa" để chuyển sang edit mode
- ✅ "Lưu & Đóng" để save và quay về view mode

### v1.0.5 (2026-06-02)
- ✅ Tối ưu chiều cao Tree View
- ✅ Compact footer thống kê
- ✅ Click logo → về Dashboard

### v1.0.4 (2026-06-02)
- ✅ Xóa branding trùng lặp trên Header

### v1.0.3 (2026-06-02)
- ✅ Thêm phân quyền user khi tạo project
- ✅ Premium UI redesign (Login, Dashboard, Sidebar)
- ✅ Fix Docker build cache issue
- ✅ Auto-save với indicator