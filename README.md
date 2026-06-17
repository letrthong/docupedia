# Guideline
 https://telua.vn/docupedia/project/proj_1781401826824?projectId=proj_1781401826824&docId=doc_1781426715279

# 📚 Docupedia (QuillFlow)

**Docupedia** (hay còn gọi là QuillFlow) là một hệ thống quản lý tài liệu và cơ sở tri thức (Knowledge Base) hiện đại. Ứng dụng cung cấp cấu trúc quản lý dạng cây thư mục kết hợp cùng trình soạn thảo văn bản phong phú (Rich Text Editor). 

Dự án được xây dựng theo kiến trúc SPA (Single Page Application) sử dụng Vanilla JS ở Frontend và Python Flask ở Backend, lưu trữ dữ liệu hoàn toàn bằng tệp JSON tĩnh nhẹ nhàng và cơ động.

## ✨ Tính năng nổi bật

- **Cấu trúc Cây Thư Mục (Tree Structure):** Quản lý tài liệu và thư mục lồng nhau trực quan, hỗ trợ CRUD (Tạo, Đổi tên, Di chuyển, Xóa).
- **Trình Soạn Thảo Chuyên Nghiệp:** Tích hợp lõi **Quill.js v2**, hỗ trợ định dạng văn bản, chèn bảng, và tô màu cú pháp mã nguồn (Highlight.js).
- **Giao Diện Thân Thiện (UI/UX):** Hỗ trợ chế độ Sáng/Tối (Dark/Light mode) mượt mà với Tailwind CSS, tích hợp hệ thống Modal và Toast Notification tối ưu.
- **Lưu Trữ JSON Thread-safe:** Loại bỏ sự phụ thuộc vào các Database Engine phức tạp (MySQL/MongoDB). Dữ liệu được lưu trong các file `.json` với cơ chế khóa tệp (File Lock), an toàn trong môi trường đa luồng (Multi-threading).
- **Phân Quyền Chi Tiết (RBAC):** Xác thực an toàn bằng JWT. Hỗ trợ phân quyền linh hoạt theo hành động (`view`, `create`, `edit`, `delete`, `manage`) cho từng thành viên trong các dự án khác nhau.
- **Import / Export Dễ Dàng:** Cho phép nhập nội dung từ `.html` / `.txt` và xuất tài liệu đang soạn thảo tải xuống máy cá nhân.
- **Tự Động Lưu (Auto-save):** Cơ chế định kỳ cập nhật trạng thái tài liệu để không thất thoát dữ liệu.

## 🛠 Công nghệ sử dụng

**Tầng Frontend:**
- HTML5, CSS3, JavaScript (ES6 Modules)
- Tailwind CSS (Quản lý layout và UI)
- FontAwesome 6.4.0 & Google Fonts (Inter)
- Quill.js (Soạn thảo văn bản)

**Tầng Backend:**
- Python 3.x
- **Flask** & **Flask-Blueprint** (Cung cấp RESTful APIs `/api/v1`)
- PyJWT (Xác thực người dùng)
- Werkzeug Security (Mã hóa mật khẩu bằng PBKDF2/Scrypt)

## 📂 Cấu trúc dự án

```text
docupedia/
│
├── docs/                      # Các tài liệu phân tích kỹ thuật (UI, JS, v.v.)
├── data/                      # Thư mục lưu trữ tự sinh chứa JSON database
├── src/
│   ├── app.py                 # File khởi chạy server Flask chính
│   ├── config_doupedia.py     # Cấu hình đường dẫn, Secret Key, môi trường
│   ├── uhes_restful_blueprint_doupedia.py # Blueprint tổng quản lý toàn bộ API
│   ├── routes/                # Xử lý các API endpoint (auth, users, projects, documents,...)
│   ├── services/              # Logic xử lý nghiệp vụ (business logic)
│   ├── utils/                 # Các công cụ hỗ trợ (JSONStorage, validators, response formats)
│   └── static/                # Tệp build tĩnh của Frontend (index.html, js/, css/)
└── README.md                  # Tài liệu hướng dẫn (File này)
```

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

**1. Cài đặt các thư viện yêu cầu:**
```bash
pip install flask pyjwt werkzeug
```

**2. Khởi chạy Server Backend:**
```bash
cd src
python app.py
```

**3. Truy cập Hệ thống:**
- Trình duyệt: `http://localhost:5000` (hoặc IP server của bạn).
- **Tài khoản mặc định (Admin):**
  - Username: `admin`
  - Password: `admin`

# http://localhost:5000/docupedia
