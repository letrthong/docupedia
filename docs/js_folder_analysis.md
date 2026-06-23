# Phân tích thư mục `js` và Logic ứng dụng (app.js)

> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (LEGACY DOCUMENT)**
> Tài liệu này mô tả logic JavaScript nguyên khối của bản mẫu (prototype) tĩnh ban đầu. 
> Hiện tại, hệ thống đã được chuyển đổi hoàn toàn sang kiến trúc Single-Page Application (SPA) viết bằng **React 18 + Vite** ở thư mục [src-react/](file:///d:/code/docupedia/src-react). Các tệp JS cũ trong thư mục `js/` không còn được sử dụng.
>
> Để xem tài liệu thiết kế mới, vui lòng tham khảo:
> - [README.md](file:///d:/code/docupedia/docs/README.md)
> - [Kiến trúc Hệ thống (architecture.md)](file:///d:/code/docupedia/docs/architecture.md)
> - [Chi tiết Thiết kế Kỹ thuật (detail_design.md)](file:///d:/code/docupedia/docs/detail_design.md)

Thư mục `js` hiện tại chứa tệp `app.js`, đóng vai trò là "bộ não" điều khiển toàn bộ tương tác, trạng thái và dữ liệu của ứng dụng QuillFlow. Dưới đây là phân tích chi tiết về cấu trúc và luồng hoạt động của tệp này.

## 1. Tổng quan kiến trúc

Tệp `app.js` được thiết kế theo mô hình Monolithic (tất cả trong một) nhưng được tổ chức thành các nhóm logic rõ ràng. Nó giao tiếp với giao diện HTML và lưu trữ dữ liệu hoàn toàn ở phía client thông qua `localStorage`.

Mặc dù tệp được nhúng vào HTML với thuộc tính `type="module"`, hiện tại nó chưa import/export các tệp JS khác mà đang hoạt động độc lập.

## 2. Các thành phần chính trong `app.js`

### 2.1. Expose Functions to Global (Đưa hàm ra phạm vi toàn cục)
Vì tệp được load dưới dạng ES6 Module (`type="module"`), các hàm bên trong nó không mặc định hiển thị ra `window`. Để các sự kiện `onclick` trực tiếp trên HTML (như `onclick="openModal('...')"` ) có thể hoạt động, đoạn mã đầu tệp đã gán thủ công các hàm này vào đối tượng `window`:
```javascript
window.closeModal = closeModal;
window.openModal = openModal;
window.loadDocument = loadDocument;
// ...
```

### 2.2. Quản lý Trạng thái (State Management)
Ứng dụng duy trì các biến trạng thái toàn cục để theo dõi tiến trình làm việc:
- `quillInstance`: Biến chứa đối tượng (instance) của trình soạn thảo Quill.
- `currentDocId`: Lưu ID của tài liệu đang được mở.
- `isDirty`: Cờ (flag) đánh dấu tài liệu đã bị chỉnh sửa nhưng chưa được lưu.
- `treeData`: Object JSON chứa toàn bộ cấu trúc cây thư mục (mối quan hệ cha-con).
- `expandedFolders`: Mảng lưu trữ ID các thư mục đang được mở (mở rộng) trên giao diện.

### 2.3. Khởi tạo ứng dụng (Initialization)
Hàm `window.onload` đóng vai trò là entry point (điểm bắt đầu), gọi lần lượt các hàm:
- `initQuill()`: Cấu hình thanh công cụ, khởi tạo Quill editor, và thiết lập bộ lắng nghe sự kiện thay đổi nội dung (`text-change`) cùng cơ chế tự động lưu (5 giây/lần).
- `loadTheme()`: Kiểm tra Dark Mode từ `localStorage` hoặc hệ thống hệ điều hành.
- `loadTreeData()`: Tải dữ liệu cây thư mục từ `localStorage`. Nếu là lần đầu tiên, nó sẽ tạo một cấu trúc dữ liệu mẫu (Default Tree) với các hướng dẫn sử dụng.
- `initEventListeners()`: Khởi tạo các sự kiện cho các nút bấm (View mode, Lưu, Copy HTML, Sidebar...).
- `renderTree()`: Vẽ cây thư mục ra HTML.
- `loadDocument()`: Hiển thị nội dung tài liệu mặc định lên trình soạn thảo.

### 2.4. Quản lý cấu trúc cây (Tree Rendering & Data)
Thuật toán quản lý cây thư mục lồng nhau được xử lý khá thông minh:
- Mọi thư mục và tài liệu đều là các *node* (nút) có các thuộc tính: `id`, `type` ('folder' hoặc 'file'), `title`, `parent`, và `children` (đối với thư mục).
- Hàm `generateNodeHtml(nodeId, depth)` là một **hàm đệ quy (recursive function)**. Nó tự gọi lại chính nó để vẽ các thư mục con và tệp tin bên trong với mức độ thõng (padding-left) tương ứng với độ sâu `depth`.

### 2.5. Các tính năng cốt lõi khác
- **Upload File:** Hỗ trợ đọc tệp `.txt` (văn bản thuần) và `.html` (trích xuất mã HTML dán vào Quill root) thông qua `FileReader`.
- **Xuất file (Export):** Hàm `exportAs` hỗ trợ tải xuống tài liệu ở 2 định dạng: `.txt` (sử dụng `quill.getText()`) và `.html` (sử dụng `quill.getSemanticHTML()` kết hợp với bộ khung HTML tạo sẵn). Sử dụng `Blob` và `URL.createObjectURL` để kích hoạt tải xuống trình duyệt.
- **Chế độ đọc (View Mode):** Hàm `toggleViewMode()` ẩn Editor và chuyển sang hiển thị HTML tĩnh trong thẻ `article.prose`, ngăn người dùng chỉnh sửa vô tình và cải thiện trải nghiệm đọc.
- **Thống kê:** Cập nhật real-time số lượng từ, kí tự và tính toán thời gian đọc (giả định tốc độ 200 từ/phút).
- **Hệ thống Modals (CRUD):** Các hàm `openCreateModal`, `openRenameModal`, `openMoveModal`, `openDeleteModal` thực hiện tương tác trực tiếp lên object `treeData`, sau đó gọi `saveTreeData()` và `renderTree()` để cập nhật giao diện ngay lập tức.

## 3. Nhận xét và Đề xuất cải tiến

Hiện tại `app.js` đang gánh vác toàn bộ logic (hơn 800 dòng code), điều này hoàn toàn ổn cho các dự án nhỏ. Tuy nhiên, vì cấu trúc HTML đã khai báo `type="module"`, bạn có thể tối ưu hóa và dễ bảo trì hơn bằng cách **tách nhỏ (Refactor)** tệp này thành các module riêng biệt trong thư mục `js`:

Ví dụ cấu trúc tách nhỏ:
```text
js/
 ├── app.js          # File gốc (entry point), import các module dưới.
 ├── editor.js       # Quản lý khởi tạo Quill, Export, Upload, Thống kê.
 ├── tree.js         # Xử lý render đệ quy cây thư mục và load/save data.
 ├── modals.js       # Xử lý logic của các hộp thoại Create, Rename, Move, Delete.
 ├── ui.js           # Xử lý Dark mode, Sidebar, Toast notifications.
 └── state.js        # Chứa các biến dùng chung (treeData, currentDocId, v.v.).
```

Việc tách module sẽ giúp mã nguồn sạch sẽ, dễ dàng test và thêm các tính năng mới trong tương lai.