# Phân tích cấu trúc giao diện QuillFlow (index.html)

Tài liệu này cung cấp cái nhìn tổng quan và phân tích chi tiết về cấu trúc của tệp `index.html` thuộc dự án QuillFlow (Docupedia).

## 1. Tổng quan

Tệp `index.html` là bộ khung giao diện người dùng (UI) chính cho **QuillFlow v2.2 Tree** - một trình soạn thảo văn bản chuyên nghiệp kết hợp hệ thống quản lý tài liệu dạng cây. 

Giao diện được thiết kế hiện đại, hỗ trợ chế độ Tối/Sáng (Dark/Light mode) và mang tính đáp ứng (responsive).

## 2. Thư viện và Tài nguyên bên ngoài

Ứng dụng tích hợp nhiều thư viện mạnh mẽ qua CDN:

- **CSS Framework:** **Tailwind CSS** (qua script CDN) được cấu hình trực tiếp trong thẻ `<script>` để hỗ trợ tùy chỉnh theme và chế độ `darkMode: 'class'`.
- **Fonts & Icons:** **Google Fonts** (font *Inter*) và **FontAwesome 6.4.0** cho các biểu tượng giao diện.
- **Syntax Highlighting:** **Highlight.js** (kèm theme *Atom One Dark*) được sử dụng để tô màu cú pháp cho các đoạn mã nguồn (Code Blocks).
- **Rich Text Editor:** **Quill.js v2.0.2** (kèm giao diện *Snow*) là bộ máy lõi xử lý soạn thảo văn bản.

## 3. Cấu trúc Custom CSS

Phần `<style>` trong thẻ `<head>` chứa nhiều tinh chỉnh quan trọng nhằm ghi đè (override) giao diện mặc định của Quill:
- Tùy chỉnh thanh cuộn (Scrollbar) cho phù hợp với giao diện tổng thể.
- Ghi đè CSS cho thanh công cụ (`.ql-toolbar`) và khu vực soạn thảo (`.ql-container`) của Quill để có viền bo góc và màu nền hiện đại hơn.
- Tinh chỉnh hiển thị Bảng biểu (Table) giúp đẹp mắt và dễ đọc hơn.
- Tùy chỉnh phong cách đặc biệt cho các khối mã nguồn (`.ql-syntax`, `.ql-code-block-container`), bao gồm cả SelectBox chọn ngôn ngữ lập trình.
- Bộ quy tắc CSS `.dark ...` để đảm bảo trình soạn thảo hiển thị hoàn hảo khi người dùng bật Dark Mode.

## 4. Cấu trúc Giao diện chính (Body Layout)

Giao diện được chia thành các khu vực chính:

### 4.1. Top Navigation Bar (Header)
- Hiển thị Logo và Tên ứng dụng.
- Ô nhập tên tài liệu (Active Document Title Input).
- Các nút tiện ích: Trạng thái tự động lưu, Nút chuyển đổi giao diện Sáng/Tối, và Nút mở Sidebar (dành cho giao diện mobile).

### 4.2. Sidebar Panel (Cấu trúc thư mục)
- Nằm ở bên trái, chứa hệ thống quản lý tài liệu (Document Tree).
- Các nút tạo mới: **Tài liệu gốc**, **Thư mục gốc**.
- Khu vực chứa danh sách cây thư mục (`#tree-container`).
- Khối thống kê ở dưới cùng: Hiển thị số Từ, số Kí tự và Thời gian ước lượng đọc.

### 4.3. Main Workspace Area (Khu vực làm việc trung tâm)
- **Thanh công cụ phụ (Top controls):** Chứa tên file đang mở và hàng loạt nút hành động:
  - **Thêm Bảng:** Kích hoạt modal chèn bảng.
  - **Xem tài liệu:** Chuyển sang chế độ chỉ đọc.
  - **Lưu lại:** Lưu thủ công.
  - **Sao chép HTML**, **Upload** file HTML/TXT, và Dropdown **Tải về** (Export ra HTML hoặc TXT).
- **Khu vực Editor (`#editor-container`):** Nơi khởi tạo Quill Editor.
- **Khu vực View Mode (`#view-mode-container`):** Giao diện chỉ đọc (Read-only), hiển thị tài liệu dưới dạng văn bản tĩnh sạch sẽ, đi kèm nút lơ lửng để quay lại chế độ chỉnh sửa.

## 5. Hệ thống Modals (Hộp thoại)

Ứng dụng thay thế hoàn toàn các hộp thoại `prompt` / `confirm` mặc định của trình duyệt bằng các Modal UI tùy chỉnh:
1. **Modal Tạo mới (`#modal-create`):** Tạo file/thư mục mới, chọn thư mục cha.
2. **Modal Đổi tên (`#modal-rename`):** Thay đổi tên tài liệu/thư mục.
3. **Modal Di chuyển (`#modal-move`):** Chuyển file/thư mục sang thư mục khác.
4. **Modal Xóa (`#modal-delete`):** Cảnh báo xác nhận trước khi xóa.
5. **Modal Chèn Bảng (`#modal-insert-table`):** Cấu hình số hàng và số cột trước khi chèn vào editor.

## 6. Hệ thống Thông báo (Toast Notification)

Một khối `#toast-message` được thiết kế để hiển thị các thông báo phản hồi (ví dụ: "Lưu thành công", "Đã sao chép") trượt lên từ góc dưới bên phải màn hình.

## 7. Liên kết với thư mục `js`

Ở cuối file `index.html` có thẻ script quan trọng:
```html
<script src="js/app.js" type="module"></script>
```

### Phân tích sự liên kết:
- Thuộc tính `type="module"` cho phép `app.js` sử dụng cú pháp ES6 Modules (`import` / `export`), giúp chia nhỏ mã nguồn Javascript thành nhiều file logic khác nhau bên trong thư mục `js` (ví dụ: `editor.js`, `tree.js`, `ui.js`, v.v.).
- Mọi tương tác của người dùng trên giao diện HTML (Click nút lưu, chuyển đổi Dark Mode, mở Modal, tương tác với cây thư mục, khởi tạo Quill) đều được lắng nghe và xử lý bởi các đoạn mã bên trong thư mục `js`.
- **Các ID quan trọng** đóng vai trò là "cầu nối" để `js/app.js` thao tác với DOM:
  - `#editor`: Nơi Quill khởi tạo.
  - `#tree-container`: Nơi JS render cây thư mục.
  - `#theme-toggle`, `#save-doc-btn`, `#export-dropdown-btn`: Các nút tương tác.
  - Khối Modal (ví dụ `#modal-create-submit`).

---

**Tóm lại:** `index.html` được cấu trúc rất bài bản, tập trung mạnh vào trải nghiệm người dùng (UX) cho một ứng dụng Single Page Application (SPA). Toàn bộ Logic nghiệp vụ được tách biệt và nhường lại cho file `js/app.js` xử lý.