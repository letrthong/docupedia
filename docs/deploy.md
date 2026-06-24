# Hướng dẫn triển khai Docupedia (Deployment Guide)

Tài liệu này hướng dẫn cách triển khai hệ thống Docupedia. Hệ thống hỗ trợ chạy trực tiếp trên môi trường máy chủ cục bộ hoặc tự động hóa hoàn toàn thông qua Docker.

---

## 🚀 Triển khai bằng Docker (Khuyến nghị)

Sử dụng Docker giúp bạn triển khai ứng dụng một cách nhanh chóng, đồng nhất và **không cần cài đặt Node.js/npm hay Python trên máy chủ vật lý (host machine)**.

### 1. Cơ chế hoạt động của Docker trong dự án
Khi bạn chạy script khởi động:
- Lệnh chạy trong script `./start_docker.sh` sẽ thực hiện `docker compose build`.
- Trong [Dockerfile](file:///d:/code/docupedia/Dockerfile):
  1. Docker sẽ cài đặt môi trường Node.js và Python tự động bên trong container.
  2. Docker copy các file quản lý thư viện [package.json](file:///d:/code/docupedia/package.json) và [package-lock.json](file:///d:/code/docupedia/package-lock.json) vào container trước và chạy `npm install --legacy-peer-deps`.
  3. Cơ chế cache của Docker sẽ tự động nhận diện nếu có sự thay đổi thư viện mới (ví dụ như khi thêm `@tailwindcss/typography`). Khi có thay đổi, Docker sẽ tự động chạy lại `npm install` để cập nhật thư viện mới bên trong container. Nếu không có thay đổi, bước này sẽ được lấy từ cache để tiết kiệm thời gian.
  4. Docker copy toàn bộ mã nguồn của dự án vào và chạy lệnh biên dịch `npm run build` để đóng gói Frontend.
  5. Flask backend khởi chạy và phục vụ toàn bộ API cùng file tĩnh trực tiếp.

Do đó, **bạn hoàn toàn không cần chạy `npm install` hay `npm run build` thủ công ngoài máy thật** trước khi chạy Docker.

---

### 2. Các bước triển khai chi tiết

#### Yêu cầu hệ thống:
* Đã cài đặt **Docker** và **Docker Compose**.
* Cấp quyền thực thi cho file script (trên Linux/macOS).

#### Các bước thực hiện:

1. **Khởi động ứng dụng:**
   Chạy script khởi động:
   * Trên **Linux / macOS**:
     ```bash
     chmod +x start_docker.sh
     ./start_docker.sh
     ```
   * Trên **Windows** (Sử dụng Git Bash hoặc WSL):
     ```bash
     ./start_docker.sh
     ```

   Script sẽ tự động dừng container cũ (nếu có), tiến hành build lại các thay đổi mới nhất (sử dụng cache thông minh) và khởi chạy container chạy ẩn ở nền (`-d`).

2. **Kiểm tra trạng thái & Nhật ký hoạt động (Logs):**
   Để theo dõi quá trình chạy của ứng dụng hoặc xem các thông báo lỗi:
   ```bash
   docker compose logs -f
   ```

3. **Truy cập ứng dụng:**
   * **URL:** `http://localhost:5000` (hoặc IP của máy chủ của bạn).
   * **Tài khoản mặc định:** `admin` / `admin`.

4. **Dừng ứng dụng:**
   Khi muốn tạm dừng hoặc gỡ bỏ các container:
   ```bash
   docker compose down
   ```

---

## 🛠 Triển khai thủ công không dùng Docker (Local Development)

Nếu bạn muốn chạy thử nghiệm trực tiếp trên môi trường của máy mà không qua Docker, hãy thực hiện theo thứ tự sau:

1. **Biên dịch Frontend:**
   * Cài đặt các thư viện Node.js:
     ```bash
     npm install
     ```
   * Biên dịch ứng dụng React thành file tĩnh:
     ```bash
     npm run build
     ```
   * *Lưu ý:* Bản build sẽ xuất ra thư mục `dist` ở gốc dự án.

2. **Chạy Backend Python:**
   * Tạo môi trường ảo và cài đặt thư viện Python:
     ```bash
     pip install -r requirements.txt
     ```
   * Khởi chạy server Flask:
     ```bash
     python src/app.py
     ```
   * Flask sẽ đọc và phục vụ file tĩnh trực tiếp từ thư mục `dist`.
