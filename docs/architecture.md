# Kiến trúc Hệ thống Docupedia

Tài liệu mô tả kiến trúc tổng quan và thiết kế RESTful API cho hệ thống lưu trữ tài liệu với hỗ trợ đa người dùng và phân quyền dự án.

---

## 1. Tổng quan Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                   CLIENT (React SPA + Vite)                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  React Router │  │  Components   │  │  React-Quill     │   │
│  │  (Pages)      │  │  (UI)         │  │  (Rich Editor)    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│           │                │                    │               │
│           └────────────────┼────────────────────┘               │
│                            ▼                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Context API  │  │  API Client   │  │  Auth Context     │   │
│  │  (State)      │  │  (Axios)      │  │  (JWT Storage)    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/REST + Authorization Header
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Flask Backend)                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Static Files │  │  REST API     │  │  Auth Middleware  │   │
│  │  (React Build)│  │  Endpoints    │  │  (JWT + RBAC)     │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                              │                                   │
│            ┌─────────────────┼─────────────────┐                │
│            ▼                 ▼                 ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ User Service │  │Project Service│  │ Document Service │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     JSON FILE STORAGE                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  users.json   │  │ projects.json │  │ permissions.json  │   │
│  │  (Users)      │  │ (Projects)    │  │ (User-Project)    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              projects/<project_id>/                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │  │
│  │  │  tree.json  │  │  docs/      │  │  folders/       │    │  │
│  │  │  (Structure)│  │  (Content)  │  │  (Metadata)     │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Stack (React + Vite)

### 2.1. Công nghệ sử dụng

| Công nghệ | Mô tả |
|-----------|-------|
| **React 18** | UI Library |
| **Vite 5** | Build tool, dev server với HMR |
| **React Router v6** | Client-side routing |
| **Tailwind CSS 3** | Utility-first CSS framework |
| **React-Quill** | Rich text editor (wrapper cho Quill.js) |
| **Axios** | HTTP client với interceptors |
| **React Context** | State management (Auth, Theme) |
| **Lucide React** | Icon library |

### 2.2. Cấu trúc thư mục Frontend

```
src-react/
├── main.jsx                 # Entry point
├── App.jsx                  # Root component + Router
├── index.css                # Custom CSS styling
│
├── api/
│   ├── client.js            # Axios instance + interceptors
│   ├── index.js             # API entry exporting all modules
│   ├── auth.js              # Auth API calls
│   ├── users.js             # User management API
│   ├── projects.js          # Project API
│   ├── documents.js         # Document CRUD API
│   └── permissions.js       # Permission API
│
├── contexts/
│   ├── index.js             # Re-exports provider and custom hooks
│   ├── AuthContext.jsx      # Authentication state & useAuth hook
│   ├── ProjectContext.jsx   # Current project state & useProject hook
│   ├── ThemeContext.jsx     # Dark/Light mode & useTheme hook
│   └── ToastContext.jsx     # Toast notification & useToast hook
│
├── components/
│   ├── index.js
│   ├── common/              # Reusable common elements
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Toast.jsx
│   ├── layout/              # Layout structural components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── MainLayout.jsx
│   └── documents/           # Document workspace & Editor components
│       ├── TreeView.jsx     # Document sidebar tree hierarchy UI
│       ├── Editor.jsx       # Document editor component (Quill integration)
│       ├── Editor.css       # Core styles for status bar, code block copy, etc.
│       ├── IconPicker.jsx   # Popover picker for document emojis
│       ├── TableTools.jsx   # Inline toolbar buttons for table insertion & management
│       ├── CustomQuillImage.js # Custom module for resizing/uploading images
│       └── editorUtils.js   # Image compression and other editor utility functions
│
└── pages/                   # Main page layout views
    ├── LoginPage.jsx
    ├── DashboardPage.jsx
    ├── ProjectPage.jsx
    ├── ProjectsManagePage.jsx
    ├── UsersPage.jsx
    ├── NewProjectPage.jsx
    ├── SettingsPage.jsx
    └── index.js
```

### 2.3. Routing Structure

```jsx
// App.jsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  
  {/* Protected routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/projects/:projectId" element={<ProjectPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    
    {/* Admin only routes */}
    <Route element={<AdminRoute />}>
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:userId" element={<UserDetailPage />} />
    </Route>
  </Route>
  
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### 2.4. Auth Context Example

```jsx
// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check token on mount
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 2.5. API Client với Interceptors

```javascript
// api/client.js
import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add auth token
client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

### 2.6. Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "react-quill": "^2.0.0",
    "axios": "^1.6.7",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.4"
  }
}
```

---

## 3. Hệ thống Người dùng & Phân quyền

### 3.1. Mô hình Phân quyền (RBAC)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    USER     │────────▶│ PERMISSION  │◀────────│   PROJECT   │
│             │   N:M   │             │   N:M   │             │
│  - admin    │         │  - view     │         │  - id       │
│  - user     │         │  - create   │         │  - name     │
│             │         │  - edit     │         │  - owner    │
│             │         │  - delete   │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

### 3.2. Roles (Vai trò)

| Role | Quyền hạn |
|------|----------|
| `admin` | Toàn quyền hệ thống: quản lý users, tạo/xóa projects, phân quyền |
| `user` | Chỉ truy cập các projects được phân quyền |

### 2.3. Permission Levels (Cấp độ quyền trên Project)

| Permission | Mô tả |
|------------|-------|
| `view` | Chỉ xem nội dung project |
| `create` | Được tạo documents/folders mới |
| `edit` | Được chỉnh sửa documents/folders |
| `delete` | Được xóa documents/folders |
| `manage` | Quản lý project (đổi tên, phân quyền cho user khác) |

### 2.4. Default User

Khi hệ thống khởi tạo lần đầu, tự động tạo tài khoản admin mặc định:

```json
{
  "username": "admin",
  "password": "admin",  // Sẽ được hash khi lưu
  "role": "admin"
}
```

> ⚠️ **Lưu ý bảo mật**: Khuyến nghị đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên.

---

## 4. RESTful API Design

### 4.1. Base URL
```
/api/v1
```

### 4.2. Authentication Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/auth/login` | Đăng nhập, trả về JWT token | ❌ |
| `POST` | `/auth/logout` | Đăng xuất (invalidate token) | ✅ |
| `GET` | `/auth/me` | Lấy thông tin user hiện tại | ✅ |
| `PUT` | `/auth/password` | Đổi mật khẩu | ✅ |

### 4.3. User Management Endpoints (Admin only)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/users` | Lấy danh sách tất cả users | ✅ Admin |
| `GET` | `/users/:id` | Lấy chi tiết một user | ✅ Admin |
| `POST` | `/users` | Tạo user mới | ✅ Admin |
| `PUT` | `/users/:id` | Cập nhật thông tin user | ✅ Admin |
| `DELETE` | `/users/:id` | Xóa user | ✅ Admin |
| `PUT` | `/users/:id/role` | Thay đổi role của user | ✅ Admin |

### 4.4. Project Management Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects` | Lấy danh sách projects (user được quyền) | ✅ |
| `GET` | `/projects/:id` | Lấy chi tiết project | ✅ Permission |
| `POST` | `/projects` | Tạo project mới | ✅ Admin |
| `PUT` | `/projects/:id` | Cập nhật thông tin project | ✅ Manage |
| `DELETE` | `/projects/:id` | Xóa project | ✅ Admin |

### 4.5. Permission Management Endpoints (Admin only)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects/:id/permissions` | Lấy danh sách quyền của project | ✅ Admin/Manage |
| `POST` | `/projects/:id/permissions` | Thêm quyền cho user vào project | ✅ Admin/Manage |
| `PUT` | `/projects/:id/permissions/:userId` | Cập nhật quyền của user | ✅ Admin/Manage |
| `DELETE` | `/projects/:id/permissions/:userId` | Xóa quyền của user khỏi project | ✅ Admin/Manage |

### 4.6. Document Endpoints (Scoped by Project)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects/:projectId/documents` | Lấy danh sách tài liệu | ✅ View |
| `GET` | `/projects/:projectId/documents/:id` | Lấy chi tiết tài liệu | ✅ View |
| `POST` | `/projects/:projectId/documents` | Tạo tài liệu mới | ✅ Create |
| `PUT` | `/projects/:projectId/documents/:id` | Cập nhật tài liệu | ✅ Edit |
| `DELETE` | `/projects/:projectId/documents/:id` | Xóa tài liệu | ✅ Delete |
| `PATCH` | `/projects/:projectId/documents/:id/move` | Di chuyển tài liệu | ✅ Edit |

### 4.7. Folder Endpoints (Scoped by Project)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects/:projectId/folders` | Lấy danh sách thư mục | ✅ View |
| `GET` | `/projects/:projectId/folders/:id` | Lấy chi tiết thư mục | ✅ View |
| `POST` | `/projects/:projectId/folders` | Tạo thư mục mới | ✅ Create |
| `PUT` | `/projects/:projectId/folders/:id` | Đổi tên thư mục | ✅ Edit |
| `DELETE` | `/projects/:projectId/folders/:id` | Xóa thư mục | ✅ Delete |

### 4.8. Tree Structure (Scoped by Project)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects/:projectId/tree` | Lấy cấu trúc cây | ✅ View |
| `PUT` | `/projects/:projectId/tree` | Cập nhật cấu trúc cây | ✅ Edit |

### 4.9. Export/Import

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/projects/:projectId/documents/:id/export?format=html` | Xuất HTML | ✅ View |
| `GET` | `/projects/:projectId/documents/:id/export?format=txt` | Xuất TXT | ✅ View |
| `POST` | `/projects/:projectId/documents/import` | Import file | ✅ Create |

---

## 5. Data Models (JSON Schemas)

### 5.1. User Schema (`users.json`)

```json
{
  "users": [
    {
      "id": "user_1",
      "username": "admin",
      "password_hash": "$2b$12$...",  // bcrypt hash
      "display_name": "Administrator",
      "email": "admin@example.com",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-06-02T10:00:00Z",
      "last_login": "2026-06-02T12:30:00Z"
    },
    {
      "id": "user_2",
      "username": "john",
      "password_hash": "$2b$12$...",
      "display_name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2026-06-02T11:00:00Z",
      "last_login": null
    }
  ]
}
```

### 5.2. Project Schema (`projects.json`)

```json
{
  "projects": [
    {
      "id": "proj_1717347200000",
      "name": "Dự án ABC",
      "description": "Mô tả ngắn về dự án",
      "owner_id": "user_1",
      "is_active": true,
      "created_at": "2026-06-02T10:00:00Z",
      "updated_at": "2026-06-02T12:30:00Z"
    }
  ]
}
```

### 5.3. Permission Schema (`permissions.json`)

```json
{
  "permissions": [
    {
      "id": "perm_1",
      "user_id": "user_2",
      "project_id": "proj_1717347200000",
      "permissions": ["view", "create", "edit"],
      "granted_by": "user_1",
      "granted_at": "2026-06-02T10:30:00Z"
    },
    {
      "id": "perm_2",
      "user_id": "user_3",
      "project_id": "proj_1717347200000",
      "permissions": ["view"],
      "granted_by": "user_1",
      "granted_at": "2026-06-02T11:00:00Z"
    }
  ]
}
```

### 5.4. Document Schema (`projects/<project_id>/docs/<doc_id>.json`)

```json
{
  "id": "doc_1717347200000",
  "type": "file",
  "title": "Tên tài liệu",
  "parent_id": "folder_guides",
  "content": {
    "ops": [
      { "insert": "Nội dung tài liệu...\n" }
    ]
  },
  "created_by": "user_1",
  "updated_by": "user_2",
  "created_at": "2026-06-02T10:00:00Z",
  "updated_at": "2026-06-02T12:30:00Z"
}
```

### 5.5. Folder Schema (`projects/<project_id>/folders/<folder_id>.json`)

```json
{
  "id": "folder_guides",
  "type": "folder",
  "title": "Hướng dẫn sử dụng",
  "parent_id": "root",
  "children": ["doc_1", "doc_2", "folder_sub"],
  "created_by": "user_1",
  "created_at": "2026-06-02T10:00:00Z",
  "updated_at": "2026-06-02T12:30:00Z"
}

### 5.6. Tree Structure (`projects/<project_id>/tree.json`)

```json
{
  "project_id": "proj_1717347200000",
  "root": {
    "id": "root",
    "type": "folder",
    "title": "Thư mục gốc",
    "children": ["folder_guides", "doc_quicknote"]
  },
  "nodes": {
    "folder_guides": { "..." },
    "doc_quicknote": { "..." }
  },
  "updated_at": "2026-06-02T12:30:00Z"
}
```

### 5.7. Comment Schema (`projects/<project_id>/docs/<doc_id>_comments.json`)

```json
{
  "doc_id": "doc_1717347200000",
  "comments": [
    {
      "id": "comment_1",
      "parent_id": null,
      "user_id": "user_2",
      "username": "john",
      "display_name": "John Doe",
      "content": "R3IGEgYiBswrBuIGx14bqtbiBiYXNlNjQ=",
      "created_at": "2026-06-26T20:00:00+07:00",
      "updated_at": "2026-06-26T20:00:00+07:00"
    },
    {
      "id": "comment_2",
      "parent_id": "comment_1",
      "user_id": "user_1",
      "username": "admin",
      "display_name": "Administrator",
      "content": "UGjhuqNuIGjhu5NpIGLhuqFuIEpvaG4=",
      "created_at": "2026-06-26T20:05:00+07:00",
      "updated_at": "2026-06-26T20:05:00+07:00"
    }
  ]
}
```

### 5.8. History Schema (`projects/<project_id>/docs/<doc_id>_history.json`)

```json
{
  "doc_id": "doc_1717347200000",
  "history": [
    {
      "id": "hist_1",
      "user_id": "user_1",
      "username": "admin",
      "display_name": "Administrator",
      "action": "create",
      "timestamp": "2026-06-02T10:00:00Z",
      "details": {
        "title": "Tài liệu ABC"
      }
    },
    {
      "id": "hist_2",
      "user_id": "user_2",
      "username": "john",
      "display_name": "John Doe",
      "action": "update",
      "timestamp": "2026-06-02T12:30:00Z",
      "details": {
        "changes": {
          "title": {
            "old": "Tài liệu ABC",
            "new": "Tài liệu ABC v2"
          },
          "content": "Nội dung tài liệu được cập nhật"
        }
      }
    }
  ]
}
```

---

## 6. Cấu trúc Thư mục Lưu trữ JSON

```
docupedia_data/
├── users.json              # Danh sách users
├── projects.json           # Danh sách projects
├── permissions.json        # Bảng phân quyền user-project
├── sessions.json           # Active sessions (optional)
│
└── projects/               # Thư mục chứa data từng project
    ├── proj_1717347200000/
    │   ├── tree.json       # Cấu trúc cây của project
    │   ├── docs/
    │   │   ├── doc_1.json
    │   │   ├── doc_1_comments.json
    │   │   ├── doc_1_history.json
    │   │   ├── doc_2.json
    │   │   ├── doc_2_comments.json
    │   │   └── doc_2_history.json
    │   └── folders/
    │       ├── folder_1.json
    │       └── folder_2.json
    │
    └── proj_1717347300000/
        ├── tree.json
        ├── docs/
        └── folders/
```

### 6.1. File khởi tạo mặc định (`users.json`)

```json
{
  "users": [
    {
      "id": "user_admin",
      "username": "admin",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4V4jO9R3c3i3i3i3",
      "display_name": "Administrator",
      "email": "",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-06-02T00:00:00Z",
      "last_login": null
    }
  ],
  "_meta": {
    "version": "1.0",
    "default_password": "admin"
  }
}
```

---

## 7. API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Thao tác thành công"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy tài liệu"
  }
}
```

### HTTP Status Codes
| Code | Ý nghĩa |
|------|---------|
| `200` | OK - Thành công |
| `201` | Created - Tạo mới thành công |
| `400` | Bad Request - Dữ liệu không hợp lệ |
| `404` | Not Found - Không tìm thấy resource |
| `500` | Internal Server Error - Lỗi server |

---

## 8. Cấu trúc Thư mục Backend Đề xuất

```
src/
├── app.py                  # Entry point, Flask app
├── config.py               # Cấu hình (data path, JWT secret, ...)
│
├── models/
│   ├── __init__.py
│   ├── user.py             # User model + CRUD
│   ├── project.py          # Project model + CRUD
│   ├── permission.py       # Permission model + CRUD
│   ├── document.py         # Document model
│   └── folder.py           # Folder model
│
├── routes/
│   ├── __init__.py
│   ├── auth.py             # /api/v1/auth/* endpoints
│   ├── users.py            # /api/v1/users/* endpoints
│   ├── projects.py         # /api/v1/projects/* endpoints
│   ├── permissions.py      # /api/v1/projects/:id/permissions/*
│   ├── documents.py        # /api/v1/projects/:id/documents/*
│   ├── folders.py          # /api/v1/projects/:id/folders/*
│   └── tree.py             # /api/v1/projects/:id/tree
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py     # Login, JWT, password hash
│   ├── user_service.py     # User CRUD logic
│   ├── project_service.py  # Project CRUD logic
│   ├── permission_service.py # Permission check logic
│   ├── document_service.py
│   └── tree_service.py
│
├── middleware/
│   ├── __init__.py
│   ├── auth_middleware.py  # JWT verification decorator
│   └── permission_middleware.py # Permission check decorator
│
├── utils/
│   ├── __init__.py
│   ├── response.py         # Helper format response
│   ├── json_storage.py     # JSON file read/write helpers
│   └── validators.py       # Input validation
│
└── static/                 # Vite build output
```

---

## 9. Chiến lược Migration từ localStorage

### Phase 1: API song song
- Giữ nguyên localStorage làm fallback
- Thêm API client mới trong `js/api.js`
- Khi có kết nối server → sync lên API
- Khi offline → fallback localStorage

### Phase 2: API là primary
- API làm nguồn dữ liệu chính
- localStorage chỉ làm cache offline
- Sync 2 chiều khi reconnect

### Phase 3: Full server-side
- Xóa bỏ localStorage dependency
- Toàn bộ dữ liệu lưu trên server
- Hỗ trợ multi-user nếu cần

---

## 10. Các cân nhắc kỹ thuật

### Security
- [ ] CORS configuration cho API
- [ ] Input validation và sanitization
- [ ] Rate limiting cho API endpoints
- [ ] Authentication (JWT) nếu multi-user

### Performance
- [ ] Pagination cho danh sách documents
- [ ] Lazy loading cho tree structure lớn
- [ ] Caching với ETags/Last-Modified
- [ ] Compression (gzip) cho response

### Reliability
- [ ] Auto-save với debounce (tránh spam API)
- [ ] Retry logic khi network unstable
- [ ] Conflict resolution cho concurrent edits
- [ ] Backup định kỳ database

---

## 11. Roadmap triển khai

| Phase | Công việc | Ưu tiên |
|-------|-----------|---------|
| 1 | Tạo JSON storage helpers và cấu trúc thư mục | Cao |
| 2 | **Implement Authentication (login/logout, JWT)** | **Cao** |
| 3 | **Implement User management (CRUD, admin only)** | **Cao** |
| 4 | **Implement Project management + permissions** | **Cao** |
| 5 | Implement CRUD endpoints cho documents (scoped by project) | Cao |
| 6 | Implement CRUD endpoints cho folders (scoped by project) | Cao |
| 7 | Tạo API client trong frontend (with auth headers) | Cao |
| 8 | Tạo Login UI + Project selector | Cao |
| 9 | Migration tool từ localStorage | Trung bình |
| 10 | Export/Import endpoints | Trung bình |
| 11 | Password reset, email notifications | Thấp |
| 12 | Real-time sync (WebSocket) | Thấp |

---

## 12. Luồng xác thực (Authentication Flow)

```
┌─────────┐          ┌─────────┐          ┌─────────┐
│  User   │          │ Frontend│          │ Backend │
└────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │
     │  1. Nhập username  │                    │
     │     + password     │                    │
     │───────────────────▶│                    │
     │                    │                    │
     │                    │ 2. POST /auth/login│
     │                    │───────────────────▶│
     │                    │                    │
     │                    │                    │ 3. Verify credentials
     │                    │                    │    từ users.json
     │                    │                    │
     │                    │ 4. JWT Token       │
     │                    │◀───────────────────│
     │                    │                    │
     │                    │ 5. Lưu token vào   │
     │                    │    localStorage    │
     │                    │                    │
     │ 6. Redirect to     │                    │
     │    Project List    │                    │
     │◀───────────────────│                    │
     │                    │                    │
     │                    │ 7. GET /projects   │
     │                    │    (+ Auth header) │
     │                    │───────────────────▶│
     │                    │                    │
     │                    │                    │ 8. Check JWT
     │                    │                    │    + permissions
     │                    │                    │
     │                    │ 9. Projects list   │
     │                    │◀───────────────────│
     │                    │                    │
     │ 10. Hiển thị       │                    │
     │     projects       │                    │
     │◀───────────────────│                    │
```

---

## 13. API Request Examples

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_admin",
      "username": "admin",
      "display_name": "Administrator",
      "role": "admin"
    }
  }
}
```

### Create User (Admin only)
```bash
curl -X POST http://localhost:5000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "username": "john",
    "password": "secret123",
    "display_name": "John Doe",
    "role": "user"
  }'
```

### Create Project (Admin only)
```bash
curl -X POST http://localhost:5000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Dự án ABC",
    "description": "Mô tả dự án"
  }'
```

### Grant Permission
```bash
curl -X POST http://localhost:5000/api/v1/projects/proj_123/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_id": "user_2",
    "permissions": ["view", "create", "edit"]
  }'
```

### Get User's Projects
```bash
curl -X GET http://localhost:5000/api/v1/projects \
  -H "Authorization: Bearer <token>"
```

Response (for non-admin user):
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "Dự án ABC",
      "permissions": ["view", "create", "edit"]
    },
    {
      "id": "proj_456",
      "name": "Dự án XYZ",
      "permissions": ["view"]
    }
  ]
}
```

---

*Cập nhật lần cuối: 2026-06-02*
