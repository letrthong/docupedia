# Chi tiết Thiết kế Kỹ thuật - Docupedia

Tài liệu thiết kế chi tiết cho Backend (Flask) và Frontend (React).

---

## Mục lục

1. [Backend - Flask](#1-backend---flask)
   - [1.1. Cấu trúc Project](#11-cấu-trúc-project)
   - [1.2. Configuration](#12-configuration)
   - [1.3. JSON Storage Layer](#13-json-storage-layer)
   - [1.4. Authentication Service](#14-authentication-service)
   - [1.5. Middleware](#15-middleware)
   - [1.6. Routes Implementation](#16-routes-implementation)
   - [1.7. Services Layer](#17-services-layer)
2. [Frontend - React](#2-frontend---react)
   - [2.1. Cấu trúc Project](#21-cấu-trúc-project)
   - [2.2. API Client](#22-api-client)
   - [2.3. Contexts](#23-contexts)
   - [2.4. Custom Hooks](#24-custom-hooks)
   - [2.5. Components](#25-components)
   - [2.6. Pages](#26-pages)
3. [Database Schema](#3-database-schema)
4. [Error Handling](#4-error-handling)
5. [Environment Variables](#5-environment-variables)

---

# 1. Backend - Flask

## 1.1. Cấu trúc Project

```
src/
├── app.py                      # Entry point
├── config.py                   # Configuration settings
├── __init__.py
│
├── models/                     # Data models (JSON schemas)
│   ├── __init__.py
│   ├── user.py
│   ├── project.py
│   ├── permission.py
│   ├── document.py
│   └── folder.py
│
├── routes/                     # API endpoints
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   ├── projects.py
│   ├── permissions.py
│   ├── documents.py
│   ├── folders.py
│   └── tree.py
│
├── services/                   # Business logic
│   ├── __init__.py
│   ├── auth_service.py
│   ├── user_service.py
│   ├── project_service.py
│   ├── permission_service.py
│   ├── document_service.py
│   └── tree_service.py
│
├── middleware/                 # Request middleware
│   ├── __init__.py
│   ├── auth_middleware.py
│   └── permission_middleware.py
│
├── utils/                      # Utility functions
│   ├── __init__.py
│   ├── response.py
│   ├── json_storage.py
│   ├── validators.py
│   └── helpers.py
│
└── static/                     # React build output
```

---

## 1.2. Configuration

### `src/config.py`

```python
import os
from datetime import timedelta

class Config:
    """Application configuration"""
    
    # Base paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'docupedia_data'))
    
    # JSON file paths
    USERS_FILE = os.path.join(DATA_DIR, 'users.json')
    PROJECTS_FILE = os.path.join(DATA_DIR, 'projects.json')
    PERMISSIONS_FILE = os.path.join(DATA_DIR, 'permissions.json')
    PROJECTS_DATA_DIR = os.path.join(DATA_DIR, 'projects')
    
    # JWT Settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    JWT_EXPIRATION_DELTA = timedelta(hours=JWT_EXPIRATION_HOURS)
    
    # Password hashing
    BCRYPT_ROUNDS = 12
    
    # API Settings
    API_PREFIX = '/api/v1'
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Debug
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Default admin credentials
    DEFAULT_ADMIN_USERNAME = 'admin'
    DEFAULT_ADMIN_PASSWORD = 'admin'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # Override with stronger settings in production
    

def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig()
    return DevelopmentConfig()
```

---

## 1.3. JSON Storage Layer

### `src/utils/json_storage.py`

```python
import json
import os
import fcntl
from datetime import datetime
from typing import Dict, List, Any, Optional
from contextlib import contextmanager


class JSONStorage:
    """Thread-safe JSON file storage with file locking"""
    
    @staticmethod
    @contextmanager
    def file_lock(filepath: str, mode: str = 'r'):
        """Context manager for file locking"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Create file if not exists
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                json.dump({}, f)
        
        with open(filepath, mode) as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                yield f
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    
    @classmethod
    def read(cls, filepath: str) -> Dict:
        """Read JSON file with lock"""
        with cls.file_lock(filepath, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    
    @classmethod
    def write(cls, filepath: str, data: Dict) -> None:
        """Write JSON file with lock"""
        with cls.file_lock(filepath, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    @classmethod
    def update(cls, filepath: str, key: str, value: Any) -> None:
        """Update specific key in JSON file"""
        data = cls.read(filepath)
        data[key] = value
        cls.write(filepath, data)
    
    @classmethod
    def append_to_list(cls, filepath: str, list_key: str, item: Dict) -> None:
        """Append item to a list in JSON file"""
        data = cls.read(filepath)
        if list_key not in data:
            data[list_key] = []
        data[list_key].append(item)
        cls.write(filepath, data)
    
    @classmethod
    def update_in_list(cls, filepath: str, list_key: str, 
                       item_id: str, updates: Dict, id_field: str = 'id') -> bool:
        """Update item in a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return False
        
        for i, item in enumerate(data[list_key]):
            if item.get(id_field) == item_id:
                data[list_key][i].update(updates)
                data[list_key][i]['updated_at'] = datetime.utcnow().isoformat() + 'Z'
                cls.write(filepath, data)
                return True
        return False
    
    @classmethod
    def delete_from_list(cls, filepath: str, list_key: str, 
                         item_id: str, id_field: str = 'id') -> bool:
        """Delete item from a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return False
        
        original_length = len(data[list_key])
        data[list_key] = [item for item in data[list_key] 
                          if item.get(id_field) != item_id]
        
        if len(data[list_key]) < original_length:
            cls.write(filepath, data)
            return True
        return False
    
    @classmethod
    def find_in_list(cls, filepath: str, list_key: str, 
                     item_id: str, id_field: str = 'id') -> Optional[Dict]:
        """Find item in a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return None
        
        for item in data[list_key]:
            if item.get(id_field) == item_id:
                return item
        return None
    
    @classmethod
    def find_by_field(cls, filepath: str, list_key: str, 
                      field: str, value: Any) -> Optional[Dict]:
        """Find item in a list by any field"""
        data = cls.read(filepath)
        if list_key not in data:
            return None
        
        for item in data[list_key]:
            if item.get(field) == value:
                return item
        return None
    
    @classmethod
    def get_list(cls, filepath: str, list_key: str) -> List[Dict]:
        """Get all items in a list"""
        data = cls.read(filepath)
        return data.get(list_key, [])


def generate_id(prefix: str = '') -> str:
    """Generate unique ID with timestamp"""
    import time
    timestamp = int(time.time() * 1000)
    return f"{prefix}_{timestamp}" if prefix else str(timestamp)


def get_timestamp() -> str:
    """Get current UTC timestamp in ISO format"""
    return datetime.utcnow().isoformat() + 'Z'
```

---

## 1.4. Authentication Service

### `src/services/auth_service.py`

```python
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from config import get_config
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config()


class AuthService:
    """Authentication service - handles login, JWT, password hashing"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=config.BCRYPT_ROUNDS)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'), 
                password_hash.encode('utf-8')
            )
        except Exception:
            return False
    
    @staticmethod
    def generate_token(user_id: str, username: str, role: str) -> str:
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + config.JWT_EXPIRATION_DELTA,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(
                token, 
                config.JWT_SECRET_KEY, 
                algorithms=[config.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None  # Token expired
        except jwt.InvalidTokenError:
            return None  # Invalid token
    
    @classmethod
    def login(cls, username: str, password: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Authenticate user and return token
        Returns: (success, user_data, token_or_error)
        """
        # Find user by username
        user = JSONStorage.find_by_field(
            config.USERS_FILE, 'users', 'username', username
        )
        
        if not user:
            return False, None, "Tên đăng nhập hoặc mật khẩu không đúng"
        
        if not user.get('is_active', True):
            return False, None, "Tài khoản đã bị vô hiệu hóa"
        
        # Verify password
        if not cls.verify_password(password, user.get('password_hash', '')):
            return False, None, "Tên đăng nhập hoặc mật khẩu không đúng"
        
        # Generate token
        token = cls.generate_token(user['id'], user['username'], user['role'])
        
        # Update last login
        JSONStorage.update_in_list(
            config.USERS_FILE, 'users', user['id'],
            {'last_login': get_timestamp()}
        )
        
        # Return user data (without sensitive fields)
        user_data = {
            'id': user['id'],
            'username': user['username'],
            'display_name': user.get('display_name', user['username']),
            'email': user.get('email', ''),
            'role': user['role']
        }
        
        return True, user_data, token
    
    @classmethod
    def change_password(cls, user_id: str, old_password: str, new_password: str) -> Tuple[bool, str]:
        """Change user password"""
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        
        if not user:
            return False, "Không tìm thấy người dùng"
        
        if not cls.verify_password(old_password, user.get('password_hash', '')):
            return False, "Mật khẩu cũ không đúng"
        
        # Validate new password
        if len(new_password) < 6:
            return False, "Mật khẩu mới phải có ít nhất 6 ký tự"
        
        # Update password
        new_hash = cls.hash_password(new_password)
        success = JSONStorage.update_in_list(
            config.USERS_FILE, 'users', user_id,
            {'password_hash': new_hash}
        )
        
        if success:
            return True, "Đổi mật khẩu thành công"
        return False, "Có lỗi xảy ra"
    
    @classmethod
    def get_user_from_token(cls, token: str) -> Optional[Dict]:
        """Get user data from token"""
        payload = cls.decode_token(token)
        if not payload:
            return None
        
        user = JSONStorage.find_in_list(
            config.USERS_FILE, 'users', payload['user_id']
        )
        
        if not user or not user.get('is_active', True):
            return None
        
        return {
            'id': user['id'],
            'username': user['username'],
            'display_name': user.get('display_name', user['username']),
            'email': user.get('email', ''),
            'role': user['role']
        }


def init_default_admin():
    """Initialize default admin user if not exists"""
    import os
    
    # Create data directory
    os.makedirs(config.DATA_DIR, exist_ok=True)
    
    # Check if users file exists and has users
    if os.path.exists(config.USERS_FILE):
        users = JSONStorage.get_list(config.USERS_FILE, 'users')
        if users:
            return  # Already has users
    
    # Create default admin
    admin_user = {
        'id': 'user_admin',
        'username': config.DEFAULT_ADMIN_USERNAME,
        'password_hash': AuthService.hash_password(config.DEFAULT_ADMIN_PASSWORD),
        'display_name': 'Administrator',
        'email': '',
        'role': 'admin',
        'is_active': True,
        'created_at': get_timestamp(),
        'last_login': None
    }
    
    data = {
        'users': [admin_user],
        '_meta': {
            'version': '1.0',
            'created_at': get_timestamp()
        }
    }
    
    JSONStorage.write(config.USERS_FILE, data)
    print(f"[Init] Created default admin user: {config.DEFAULT_ADMIN_USERNAME}")
```

---

## 1.5. Middleware

### `src/middleware/auth_middleware.py`

```python
from functools import wraps
from flask import request, g
from services.auth_service import AuthService
from utils.response import error_response


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return error_response('Token không hợp lệ', 'INVALID_TOKEN', 401)
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Verify token and get user
        user = AuthService.get_user_from_token(token)
        
        if not user:
            return error_response('Token hết hạn hoặc không hợp lệ', 'UNAUTHORIZED', 401)
        
        # Store user in flask.g for access in route handlers
        g.current_user = user
        
        return f(*args, **kwargs)
    
    return decorated


def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if g.current_user.get('role') != 'admin':
            return error_response('Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403)
        return f(*args, **kwargs)
    
    return decorated


def get_current_user():
    """Get current authenticated user from flask.g"""
    return getattr(g, 'current_user', None)
```

### `src/middleware/permission_middleware.py`

```python
from functools import wraps
from flask import g
from config import get_config
from utils.json_storage import JSONStorage
from utils.response import error_response

config = get_config()


def get_user_permissions(user_id: str, project_id: str) -> list:
    """Get user's permissions for a project"""
    # Admin has all permissions
    user = g.current_user
    if user and user.get('role') == 'admin':
        return ['view', 'create', 'edit', 'delete', 'manage']
    
    # Check project owner
    projects = JSONStorage.get_list(config.PROJECTS_FILE, 'projects')
    for project in projects:
        if project['id'] == project_id and project.get('owner_id') == user_id:
            return ['view', 'create', 'edit', 'delete', 'manage']
    
    # Get from permissions file
    permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
    for perm in permissions:
        if perm['user_id'] == user_id and perm['project_id'] == project_id:
            return perm.get('permissions', [])
    
    return []


def require_permission(required_permissions: list):
    """Decorator factory to require specific permissions on a project"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            project_id = kwargs.get('project_id')
            
            if not project_id:
                return error_response('Project ID không hợp lệ', 'INVALID_PROJECT', 400)
            
            user = g.current_user
            user_permissions = get_user_permissions(user['id'], project_id)
            
            # Check if user has at least one of the required permissions
            has_permission = any(p in user_permissions for p in required_permissions)
            
            if not has_permission:
                return error_response(
                    'Bạn không có quyền truy cập project này',
                    'PERMISSION_DENIED',
                    403
                )
            
            # Store permissions for use in route
            g.user_permissions = user_permissions
            
            return f(*args, **kwargs)
        
        return decorated
    return decorator


def check_permission(user_id: str, project_id: str, required: str) -> bool:
    """Check if user has specific permission"""
    permissions = get_user_permissions(user_id, project_id)
    return required in permissions
```

---

## 1.6. Routes Implementation

### `src/routes/__init__.py`

```python
from flask import Blueprint

# Create blueprints
auth_bp = Blueprint('auth', __name__)
users_bp = Blueprint('users', __name__)
projects_bp = Blueprint('projects', __name__)
permissions_bp = Blueprint('permissions', __name__)
documents_bp = Blueprint('documents', __name__)
folders_bp = Blueprint('folders', __name__)
tree_bp = Blueprint('tree', __name__)


def register_routes(app):
    """Register all blueprints with the Flask app"""
    from config import get_config
    config = get_config()
    prefix = config.API_PREFIX
    
    # Import route handlers
    from routes import auth, users, projects, permissions, documents, folders, tree
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix=f'{prefix}/auth')
    app.register_blueprint(users_bp, url_prefix=f'{prefix}/users')
    app.register_blueprint(projects_bp, url_prefix=f'{prefix}/projects')
    # Nested routes for permissions, documents, folders, tree
    app.register_blueprint(permissions_bp, url_prefix=f'{prefix}/projects')
    app.register_blueprint(documents_bp, url_prefix=f'{prefix}/projects')
    app.register_blueprint(folders_bp, url_prefix=f'{prefix}/projects')
    app.register_blueprint(tree_bp, url_prefix=f'{prefix}/projects')
```

### `src/routes/auth.py`

```python
from flask import request
from routes import auth_bp
from services.auth_service import AuthService
from middleware.auth_middleware import require_auth, get_current_user
from utils.response import success_response, error_response
from utils.validators import validate_login, validate_password_change


@auth_bp.route('/login', methods=['POST'])
def login():
    """POST /api/v1/auth/login - User login"""
    data = request.get_json()
    
    # Validate input
    is_valid, error = validate_login(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    # Attempt login
    success, user_data, result = AuthService.login(
        data['username'],
        data['password']
    )
    
    if success:
        return success_response({
            'token': result,
            'user': user_data
        }, 'Đăng nhập thành công')
    else:
        return error_response(result, 'AUTH_FAILED', 401)


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """POST /api/v1/auth/logout - User logout"""
    # In a stateless JWT setup, logout is handled client-side
    # Server can optionally maintain a token blacklist
    return success_response(None, 'Đăng xuất thành công')


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """GET /api/v1/auth/me - Get current user info"""
    user = get_current_user()
    return success_response(user)


@auth_bp.route('/password', methods=['PUT'])
@require_auth
def change_password():
    """PUT /api/v1/auth/password - Change password"""
    data = request.get_json()
    user = get_current_user()
    
    # Validate input
    is_valid, error = validate_password_change(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    # Change password
    success, message = AuthService.change_password(
        user['id'],
        data['old_password'],
        data['new_password']
    )
    
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'PASSWORD_CHANGE_FAILED', 400)
```

### `src/routes/users.py`

```python
from flask import request
from routes import users_bp
from services.user_service import UserService
from middleware.auth_middleware import require_admin
from utils.response import success_response, error_response
from utils.validators import validate_user_create, validate_user_update


@users_bp.route('', methods=['GET'])
@require_admin
def get_users():
    """GET /api/v1/users - Get all users (Admin only)"""
    users = UserService.get_all_users()
    return success_response(users)


@users_bp.route('/<user_id>', methods=['GET'])
@require_admin
def get_user(user_id):
    """GET /api/v1/users/:id - Get user by ID (Admin only)"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        return error_response('Không tìm thấy người dùng', 'NOT_FOUND', 404)
    return success_response(user)


@users_bp.route('', methods=['POST'])
@require_admin
def create_user():
    """POST /api/v1/users - Create new user (Admin only)"""
    data = request.get_json()
    
    is_valid, error = validate_user_create(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = UserService.create_user(data)
    if success:
        return success_response(result, 'Tạo người dùng thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@users_bp.route('/<user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    """PUT /api/v1/users/:id - Update user (Admin only)"""
    data = request.get_json()
    
    is_valid, error = validate_user_update(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = UserService.update_user(user_id, data)
    if success:
        return success_response(result, 'Cập nhật người dùng thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@users_bp.route('/<user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """DELETE /api/v1/users/:id - Delete user (Admin only)"""
    success, message = UserService.delete_user(user_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)


@users_bp.route('/<user_id>/role', methods=['PUT'])
@require_admin
def change_user_role(user_id):
    """PUT /api/v1/users/:id/role - Change user role (Admin only)"""
    data = request.get_json()
    role = data.get('role')
    
    if role not in ['admin', 'user']:
        return error_response('Role không hợp lệ', 'VALIDATION_ERROR', 400)
    
    success, result = UserService.change_role(user_id, role)
    if success:
        return success_response(result, 'Thay đổi role thành công')
    else:
        return error_response(result, 'ROLE_CHANGE_FAILED', 400)
```

### `src/routes/projects.py`

```python
from flask import request, g
from routes import projects_bp
from services.project_service import ProjectService
from middleware.auth_middleware import require_auth, require_admin, get_current_user
from middleware.permission_middleware import require_permission
from utils.response import success_response, error_response
from utils.validators import validate_project


@projects_bp.route('', methods=['GET'])
@require_auth
def get_projects():
    """GET /api/v1/projects - Get user's accessible projects"""
    user = get_current_user()
    projects = ProjectService.get_user_projects(user['id'], user['role'])
    return success_response(projects)


@projects_bp.route('/<project_id>', methods=['GET'])
@require_auth
@require_permission(['view'])
def get_project(project_id):
    """GET /api/v1/projects/:id - Get project details"""
    project = ProjectService.get_project_by_id(project_id)
    if not project:
        return error_response('Không tìm thấy project', 'NOT_FOUND', 404)
    
    # Add user's permissions to response
    project['user_permissions'] = g.user_permissions
    return success_response(project)


@projects_bp.route('', methods=['POST'])
@require_admin
def create_project():
    """POST /api/v1/projects - Create new project (Admin only)"""
    data = request.get_json()
    user = get_current_user()
    
    is_valid, error = validate_project(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = ProjectService.create_project(data, user['id'])
    if success:
        return success_response(result, 'Tạo project thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@projects_bp.route('/<project_id>', methods=['PUT'])
@require_auth
@require_permission(['manage'])
def update_project(project_id):
    """PUT /api/v1/projects/:id - Update project"""
    data = request.get_json()
    
    success, result = ProjectService.update_project(project_id, data)
    if success:
        return success_response(result, 'Cập nhật project thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@projects_bp.route('/<project_id>', methods=['DELETE'])
@require_admin
def delete_project(project_id):
    """DELETE /api/v1/projects/:id - Delete project (Admin only)"""
    success, message = ProjectService.delete_project(project_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)
```

### `src/routes/documents.py`

```python
from flask import request, g
from routes import documents_bp
from services.document_service import DocumentService
from middleware.auth_middleware import require_auth, get_current_user
from middleware.permission_middleware import require_permission
from utils.response import success_response, error_response
from utils.validators import validate_document


@documents_bp.route('/<project_id>/documents', methods=['GET'])
@require_auth
@require_permission(['view'])
def get_documents(project_id):
    """GET /api/v1/projects/:projectId/documents - Get all documents"""
    documents = DocumentService.get_all_documents(project_id)
    return success_response(documents)


@documents_bp.route('/<project_id>/documents/<doc_id>', methods=['GET'])
@require_auth
@require_permission(['view'])
def get_document(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id - Get document"""
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
    return success_response(document)


@documents_bp.route('/<project_id>/documents', methods=['POST'])
@require_auth
@require_permission(['create'])
def create_document(project_id):
    """POST /api/v1/projects/:projectId/documents - Create document"""
    data = request.get_json()
    user = get_current_user()
    
    is_valid, error = validate_document(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.create_document(project_id, data, user['id'])
    if success:
        return success_response(result, 'Tạo tài liệu thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@documents_bp.route('/<project_id>/documents/<doc_id>', methods=['PUT'])
@require_auth
@require_permission(['edit'])
def update_document(project_id, doc_id):
    """PUT /api/v1/projects/:projectId/documents/:id - Update document"""
    data = request.get_json()
    user = get_current_user()
    
    success, result = DocumentService.update_document(project_id, doc_id, data, user['id'])
    if success:
        return success_response(result, 'Cập nhật tài liệu thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@documents_bp.route('/<project_id>/documents/<doc_id>', methods=['DELETE'])
@require_auth
@require_permission(['delete'])
def delete_document(project_id, doc_id):
    """DELETE /api/v1/projects/:projectId/documents/:id - Delete document"""
    success, message = DocumentService.delete_document(project_id, doc_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)


@documents_bp.route('/<project_id>/documents/<doc_id>/move', methods=['PATCH'])
@require_auth
@require_permission(['edit'])
def move_document(project_id, doc_id):
    """PATCH /api/v1/projects/:projectId/documents/:id/move - Move document"""
    data = request.get_json()
    new_parent_id = data.get('parent_id')
    
    if not new_parent_id:
        return error_response('parent_id là bắt buộc', 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.move_document(project_id, doc_id, new_parent_id)
    if success:
        return success_response(result, 'Di chuyển tài liệu thành công')
    else:
        return error_response(result, 'MOVE_FAILED', 400)


@documents_bp.route('/<project_id>/documents/<doc_id>/export', methods=['GET'])
@require_auth
@require_permission(['view'])
def export_document(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id/export - Export document"""
    format_type = request.args.get('format', 'html')
    
    if format_type not in ['html', 'txt']:
        return error_response('Format không hỗ trợ', 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.export_document(project_id, doc_id, format_type)
    if success:
        return success_response(result)
    else:
        return error_response(result, 'EXPORT_FAILED', 400)
```

---

## 1.7. Services Layer

### `src/services/user_service.py`

```python
from typing import List, Dict, Tuple, Optional
from config import get_config
from services.auth_service import AuthService
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config()


class UserService:
    """User management service"""
    
    @staticmethod
    def get_all_users() -> List[Dict]:
        """Get all users (without password_hash)"""
        users = JSONStorage.get_list(config.USERS_FILE, 'users')
        return [UserService._sanitize_user(u) for u in users]
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict]:
        """Get user by ID (without password_hash)"""
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        return UserService._sanitize_user(user) if user else None
    
    @staticmethod
    def create_user(data: Dict) -> Tuple[bool, any]:
        """Create new user"""
        # Check if username exists
        existing = JSONStorage.find_by_field(
            config.USERS_FILE, 'users', 'username', data['username']
        )
        if existing:
            return False, "Tên đăng nhập đã tồn tại"
        
        # Create user
        user = {
            'id': generate_id('user'),
            'username': data['username'],
            'password_hash': AuthService.hash_password(data['password']),
            'display_name': data.get('display_name', data['username']),
            'email': data.get('email', ''),
            'role': data.get('role', 'user'),
            'is_active': True,
            'created_at': get_timestamp(),
            'last_login': None
        }
        
        JSONStorage.append_to_list(config.USERS_FILE, 'users', user)
        return True, UserService._sanitize_user(user)
    
    @staticmethod
    def update_user(user_id: str, data: Dict) -> Tuple[bool, any]:
        """Update user"""
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
        
        # Check username conflict
        if 'username' in data and data['username'] != user['username']:
            existing = JSONStorage.find_by_field(
                config.USERS_FILE, 'users', 'username', data['username']
            )
            if existing:
                return False, "Tên đăng nhập đã tồn tại"
        
        # Prepare updates
        updates = {}
        allowed_fields = ['username', 'display_name', 'email', 'is_active']
        for field in allowed_fields:
            if field in data:
                updates[field] = data[field]
        
        # Update password if provided
        if 'password' in data and data['password']:
            updates['password_hash'] = AuthService.hash_password(data['password'])
        
        success = JSONStorage.update_in_list(
            config.USERS_FILE, 'users', user_id, updates
        )
        
        if success:
            updated_user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
            return True, UserService._sanitize_user(updated_user)
        return False, "Có lỗi xảy ra"
    
    @staticmethod
    def delete_user(user_id: str) -> Tuple[bool, str]:
        """Delete user"""
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
        
        # Prevent deleting last admin
        if user['role'] == 'admin':
            users = JSONStorage.get_list(config.USERS_FILE, 'users')
            admin_count = sum(1 for u in users if u['role'] == 'admin')
            if admin_count <= 1:
                return False, "Không thể xóa admin cuối cùng"
        
        success = JSONStorage.delete_from_list(config.USERS_FILE, 'users', user_id)
        
        # Also delete user's permissions
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        permissions = [p for p in permissions if p['user_id'] != user_id]
        JSONStorage.update(config.PERMISSIONS_FILE, 'permissions', permissions)
        
        if success:
            return True, "Xóa người dùng thành công"
        return False, "Có lỗi xảy ra"
    
    @staticmethod
    def change_role(user_id: str, new_role: str) -> Tuple[bool, any]:
        """Change user role"""
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
        
        # Prevent demoting last admin
        if user['role'] == 'admin' and new_role != 'admin':
            users = JSONStorage.get_list(config.USERS_FILE, 'users')
            admin_count = sum(1 for u in users if u['role'] == 'admin')
            if admin_count <= 1:
                return False, "Không thể hạ quyền admin cuối cùng"
        
        success = JSONStorage.update_in_list(
            config.USERS_FILE, 'users', user_id, {'role': new_role}
        )
        
        if success:
            updated_user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
            return True, UserService._sanitize_user(updated_user)
        return False, "Có lỗi xảy ra"
    
    @staticmethod
    def _sanitize_user(user: Dict) -> Dict:
        """Remove sensitive fields from user object"""
        if not user:
            return None
        return {k: v for k, v in user.items() if k != 'password_hash'}
```

### `src/services/project_service.py`

```python
import os
import shutil
from typing import List, Dict, Tuple, Optional
from config import get_config
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config()


class ProjectService:
    """Project management service"""
    
    @staticmethod
    def get_all_projects() -> List[Dict]:
        """Get all projects"""
        return JSONStorage.get_list(config.PROJECTS_FILE, 'projects')
    
    @staticmethod
    def get_user_projects(user_id: str, user_role: str) -> List[Dict]:
        """Get projects accessible by user"""
        projects = JSONStorage.get_list(config.PROJECTS_FILE, 'projects')
        
        # Admin sees all projects
        if user_role == 'admin':
            for p in projects:
                p['user_permissions'] = ['view', 'create', 'edit', 'delete', 'manage']
            return projects
        
        # Regular user sees owned projects + permitted projects
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        user_permissions = {p['project_id']: p['permissions'] for p in permissions 
                          if p['user_id'] == user_id}
        
        accessible = []
        for project in projects:
            # Owner has all permissions
            if project.get('owner_id') == user_id:
                project['user_permissions'] = ['view', 'create', 'edit', 'delete', 'manage']
                accessible.append(project)
            # Has explicit permission
            elif project['id'] in user_permissions:
                project['user_permissions'] = user_permissions[project['id']]
                accessible.append(project)
        
        return accessible
    
    @staticmethod
    def get_project_by_id(project_id: str) -> Optional[Dict]:
        """Get project by ID"""
        return JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
    
    @staticmethod
    def create_project(data: Dict, owner_id: str) -> Tuple[bool, any]:
        """Create new project"""
        project_id = generate_id('proj')
        
        project = {
            'id': project_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'owner_id': owner_id,
            'is_active': True,
            'created_at': get_timestamp(),
            'updated_at': get_timestamp()
        }
        
        # Create project directory structure
        project_dir = os.path.join(config.PROJECTS_DATA_DIR, project_id)
        os.makedirs(os.path.join(project_dir, 'docs'), exist_ok=True)
        os.makedirs(os.path.join(project_dir, 'folders'), exist_ok=True)
        
        # Create initial tree.json
        tree = {
            'project_id': project_id,
            'root': {
                'id': 'root',
                'type': 'folder',
                'title': 'Thư mục gốc',
                'children': []
            },
            'nodes': {},
            'updated_at': get_timestamp()
        }
        tree_file = os.path.join(project_dir, 'tree.json')
        JSONStorage.write(tree_file, tree)
        
        # Save project to projects.json
        JSONStorage.append_to_list(config.PROJECTS_FILE, 'projects', project)
        
        return True, project
    
    @staticmethod
    def update_project(project_id: str, data: Dict) -> Tuple[bool, any]:
        """Update project"""
        project = JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        if not project:
            return False, "Không tìm thấy project"
        
        updates = {}
        allowed_fields = ['name', 'description', 'is_active']
        for field in allowed_fields:
            if field in data:
                updates[field] = data[field]
        
        success = JSONStorage.update_in_list(
            config.PROJECTS_FILE, 'projects', project_id, updates
        )
        
        if success:
            return True, JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        return False, "Có lỗi xảy ra"
    
    @staticmethod
    def delete_project(project_id: str) -> Tuple[bool, str]:
        """Delete project and all its data"""
        project = JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        if not project:
            return False, "Không tìm thấy project"
        
        # Delete project directory
        project_dir = os.path.join(config.PROJECTS_DATA_DIR, project_id)
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        
        # Delete project from list
        success = JSONStorage.delete_from_list(config.PROJECTS_FILE, 'projects', project_id)
        
        # Delete related permissions
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        permissions = [p for p in permissions if p['project_id'] != project_id]
        JSONStorage.update(config.PERMISSIONS_FILE, 'permissions', permissions)
        
        if success:
            return True, "Xóa project thành công"
        return False, "Có lỗi xảy ra"
```

### `src/services/document_service.py`

```python
import os
from typing import List, Dict, Tuple, Optional
from config import get_config
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config()


class DocumentService:
    """Document management service"""
    
    @staticmethod
    def _get_docs_dir(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'docs')
    
    @staticmethod
    def _get_tree_file(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'tree.json')
    
    @staticmethod
    def get_all_documents(project_id: str) -> List[Dict]:
        """Get all documents in a project"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        documents = []
        
        if os.path.exists(docs_dir):
            for filename in os.listdir(docs_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(docs_dir, filename)
                    doc = JSONStorage.read(filepath)
                    # Don't include content in list view
                    doc_summary = {k: v for k, v in doc.items() if k != 'content'}
                    documents.append(doc_summary)
        
        return documents
    
    @staticmethod
    def get_document(project_id: str, doc_id: str) -> Optional[Dict]:
        """Get document by ID (including content)"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if os.path.exists(filepath):
            return JSONStorage.read(filepath)
        return None
    
    @staticmethod
    def create_document(project_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Create new document"""
        doc_id = generate_id('doc')
        timestamp = get_timestamp()
        
        document = {
            'id': doc_id,
            'type': 'file',
            'title': data['title'],
            'parent_id': data.get('parent_id', 'root'),
            'content': data.get('content', {'ops': []}),
            'created_by': user_id,
            'updated_by': user_id,
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        # Save document file
        docs_dir = DocumentService._get_docs_dir(project_id)
        os.makedirs(docs_dir, exist_ok=True)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        JSONStorage.write(filepath, document)
        
        # Update tree
        DocumentService._add_to_tree(project_id, doc_id, document['parent_id'])
        
        return True, document
    
    @staticmethod
    def update_document(project_id: str, doc_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Update document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        document = JSONStorage.read(filepath)
        
        # Update allowed fields
        if 'title' in data:
            document['title'] = data['title']
        if 'content' in data:
            document['content'] = data['content']
        
        document['updated_by'] = user_id
        document['updated_at'] = get_timestamp()
        
        JSONStorage.write(filepath, document)
        
        # Update in tree nodes
        DocumentService._update_in_tree(project_id, doc_id, {'title': document['title']})
        
        return True, document
    
    @staticmethod
    def delete_document(project_id: str, doc_id: str) -> Tuple[bool, str]:
        """Delete document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        # Get parent before deleting
        document = JSONStorage.read(filepath)
        parent_id = document.get('parent_id', 'root')
        
        # Delete file
        os.remove(filepath)
        
        # Remove from tree
        DocumentService._remove_from_tree(project_id, doc_id, parent_id)
        
        return True, "Xóa tài liệu thành công"
    
    @staticmethod
    def move_document(project_id: str, doc_id: str, new_parent_id: str) -> Tuple[bool, any]:
        """Move document to new parent"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        document = JSONStorage.read(filepath)
        old_parent_id = document.get('parent_id', 'root')
        
        # Update document
        document['parent_id'] = new_parent_id
        document['updated_at'] = get_timestamp()
        JSONStorage.write(filepath, document)
        
        # Update tree
        DocumentService._move_in_tree(project_id, doc_id, old_parent_id, new_parent_id)
        
        return True, document
    
    @staticmethod
    def export_document(project_id: str, doc_id: str, format_type: str) -> Tuple[bool, any]:
        """Export document to HTML or TXT"""
        document = DocumentService.get_document(project_id, doc_id)
        if not document:
            return False, "Không tìm thấy tài liệu"
        
        content = document.get('content', {})
        title = document.get('title', 'Untitled')
        
        if format_type == 'txt':
            # Extract plain text from Quill delta
            text = DocumentService._delta_to_text(content)
            return True, {
                'filename': f'{title}.txt',
                'content': text,
                'mime_type': 'text/plain'
            }
        else:  # html
            html = DocumentService._delta_to_html(content, title)
            return True, {
                'filename': f'{title}.html',
                'content': html,
                'mime_type': 'text/html'
            }
    
    @staticmethod
    def _delta_to_text(delta: Dict) -> str:
        """Convert Quill delta to plain text"""
        ops = delta.get('ops', [])
        text_parts = []
        for op in ops:
            if isinstance(op.get('insert'), str):
                text_parts.append(op['insert'])
        return ''.join(text_parts)
    
    @staticmethod
    def _delta_to_html(delta: Dict, title: str) -> str:
        """Convert Quill delta to HTML (basic implementation)"""
        text = DocumentService._delta_to_text(delta)
        # Basic HTML wrapper
        return f'''<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <div>{text.replace(chr(10), '<br>')}</div>
</body>
</html>'''
    
    @staticmethod
    def _add_to_tree(project_id: str, node_id: str, parent_id: str):
        """Add node to tree"""
        tree_file = DocumentService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Add to parent's children
        if parent_id == 'root':
            tree['root']['children'].append(node_id)
        elif parent_id in tree.get('nodes', {}):
            if 'children' not in tree['nodes'][parent_id]:
                tree['nodes'][parent_id]['children'] = []
            tree['nodes'][parent_id]['children'].append(node_id)
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def _remove_from_tree(project_id: str, node_id: str, parent_id: str):
        """Remove node from tree"""
        tree_file = DocumentService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Remove from parent's children
        if parent_id == 'root':
            tree['root']['children'] = [c for c in tree['root']['children'] if c != node_id]
        elif parent_id in tree.get('nodes', {}):
            tree['nodes'][parent_id]['children'] = [
                c for c in tree['nodes'][parent_id].get('children', []) if c != node_id
            ]
        
        # Remove from nodes
        if node_id in tree.get('nodes', {}):
            del tree['nodes'][node_id]
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def _update_in_tree(project_id: str, node_id: str, updates: Dict):
        """Update node in tree"""
        tree_file = DocumentService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        if node_id in tree.get('nodes', {}):
            tree['nodes'][node_id].update(updates)
            tree['updated_at'] = get_timestamp()
            JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def _move_in_tree(project_id: str, node_id: str, old_parent: str, new_parent: str):
        """Move node in tree"""
        tree_file = DocumentService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Remove from old parent
        if old_parent == 'root':
            tree['root']['children'] = [c for c in tree['root']['children'] if c != node_id]
        elif old_parent in tree.get('nodes', {}):
            tree['nodes'][old_parent]['children'] = [
                c for c in tree['nodes'][old_parent].get('children', []) if c != node_id
            ]
        
        # Add to new parent
        if new_parent == 'root':
            tree['root']['children'].append(node_id)
        elif new_parent in tree.get('nodes', {}):
            if 'children' not in tree['nodes'][new_parent]:
                tree['nodes'][new_parent]['children'] = []
            tree['nodes'][new_parent]['children'].append(node_id)
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
```

---

## 1.8. Utility Functions

### `src/utils/response.py`

```python
from flask import jsonify
from typing import Any, Optional


def success_response(data: Any = None, message: str = "Thành công", status_code: int = 200):
    """Create success response"""
    response = {
        'success': True,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(message: str, error_code: str = "ERROR", status_code: int = 400):
    """Create error response"""
    return jsonify({
        'success': False,
        'error': {
            'code': error_code,
            'message': message
        }
    }), status_code


def paginated_response(data: list, page: int, per_page: int, total: int):
    """Create paginated response"""
    return jsonify({
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page
        }
    }), 200
```

### `src/utils/validators.py`

```python
import re
from typing import Tuple, Dict, Any


def validate_login(data: Dict) -> Tuple[bool, str]:
    """Validate login data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('username'):
        return False, "Tên đăng nhập là bắt buộc"
    if not data.get('password'):
        return False, "Mật khẩu là bắt buộc"
    return True, ""


def validate_user_create(data: Dict) -> Tuple[bool, str]:
    """Validate user creation data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    
    username = data.get('username', '')
    if not username or len(username) < 3:
        return False, "Tên đăng nhập phải có ít nhất 3 ký tự"
    if len(username) > 50:
        return False, "Tên đăng nhập không được quá 50 ký tự"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"
    
    password = data.get('password', '')
    if not password or len(password) < 6:
        return False, "Mật khẩu phải có ít nhất 6 ký tự"
    
    role = data.get('role', 'user')
    if role not in ['admin', 'user']:
        return False, "Role không hợp lệ"
    
    return True, ""


def validate_user_update(data: Dict) -> Tuple[bool, str]:
    """Validate user update data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    
    if 'username' in data:
        username = data['username']
        if len(username) < 3:
            return False, "Tên đăng nhập phải có ít nhất 3 ký tự"
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return False, "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"
    
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return False, "Mật khẩu phải có ít nhất 6 ký tự"
    
    return True, ""


def validate_password_change(data: Dict) -> Tuple[bool, str]:
    """Validate password change data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('old_password'):
        return False, "Mật khẩu cũ là bắt buộc"
    if not data.get('new_password'):
        return False, "Mật khẩu mới là bắt buộc"
    if len(data['new_password']) < 6:
        return False, "Mật khẩu mới phải có ít nhất 6 ký tự"
    return True, ""


def validate_project(data: Dict) -> Tuple[bool, str]:
    """Validate project data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('name'):
        return False, "Tên project là bắt buộc"
    if len(data['name']) > 100:
        return False, "Tên project không được quá 100 ký tự"
    return True, ""


def validate_document(data: Dict) -> Tuple[bool, str]:
    """Validate document data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('title'):
        return False, "Tiêu đề tài liệu là bắt buộc"
    if len(data['title']) > 200:
        return False, "Tiêu đề không được quá 200 ký tự"
    return True, ""


def validate_folder(data: Dict) -> Tuple[bool, str]:
    """Validate folder data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('title'):
        return False, "Tên thư mục là bắt buộc"
    if len(data['title']) > 100:
        return False, "Tên thư mục không được quá 100 ký tự"
    return True, ""


def validate_permission(data: Dict) -> Tuple[bool, str]:
    """Validate permission data"""
    if not data:
        return False, "Dữ liệu không hợp lệ"
    if not data.get('user_id'):
        return False, "user_id là bắt buộc"
    
    permissions = data.get('permissions', [])
    valid_permissions = ['view', 'create', 'edit', 'delete', 'manage']
    for p in permissions:
        if p not in valid_permissions:
            return False, f"Permission '{p}' không hợp lệ"
    
    return True, ""
```

---

## 1.9. Main Application

### `src/app.py`

```python
from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from config import get_config
from routes import register_routes
from services.auth_service import init_default_admin

config = get_config()

# Initialize Flask app
app = Flask(__name__, static_folder='static')

# CORS configuration
CORS(app, origins=config.CORS_ORIGINS)

# Register API routes
register_routes(app)

# Serve React static files
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Try to serve static file, fallback to index.html for SPA routing
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


# Error handlers
@app.errorhandler(404)
def not_found(e):
    # For API routes, return JSON error
    from flask import request
    if request.path.startswith('/api/'):
        from utils.response import error_response
        return error_response('Endpoint không tồn tại', 'NOT_FOUND', 404)
    # For other routes, serve index.html (SPA handling)
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(500)
def server_error(e):
    from utils.response import error_response
    return error_response('Lỗi server', 'SERVER_ERROR', 500)


if __name__ == '__main__':
    # Initialize data
    init_default_admin()
    
    # Initialize empty files if not exist
    for filepath in [config.PROJECTS_FILE, config.PERMISSIONS_FILE]:
        if not os.path.exists(filepath):
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w') as f:
                import json
                json.dump({'projects': []} if 'projects' in filepath else {'permissions': []}, f)
    
    # Run app
    print(f"[Flask] Starting server on port 5000...")
    print(f"[Flask] Data directory: {config.DATA_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=config.DEBUG)
```

---

# 2. Frontend - React

## 2.1. Cấu trúc Project

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root component + Router
├── index.css                   # Global styles + Tailwind
│
├── api/                        # API layer
│   ├── client.js              # Axios instance
│   ├── auth.js                # Auth endpoints
│   ├── users.js               # User endpoints
│   ├── projects.js            # Project endpoints
│   ├── documents.js           # Document endpoints
│   └── permissions.js         # Permission endpoints
│
├── contexts/                   # React Context providers
│   ├── AuthContext.jsx        # Authentication state
│   ├── ProjectContext.jsx     # Current project state
│   ├── ThemeContext.jsx       # Theme (dark/light)
│   └── ToastContext.jsx       # Toast notifications
│
├── hooks/                      # Custom hooks
│   ├── useAuth.js
│   ├── useProject.js
│   ├── useDocuments.js
│   └── useToast.js
│
├── components/                 # Reusable components
│   ├── common/
│   ├── layout/
│   ├── auth/
│   ├── projects/
│   ├── users/
│   ├── documents/
│   └── editor/
│
├── pages/                      # Page components
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ProjectPage.jsx
│   ├── UsersPage.jsx
│   ├── SettingsPage.jsx
│   └── NotFoundPage.jsx
│
└── utils/                      # Utility functions
    ├── constants.js
    ├── helpers.js
    └── storage.js
```

---

## 2.2. API Client

### `src/api/client.js`

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response } = error;
    
    // Handle 401 Unauthorized
    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Extract error message
    const message = response?.data?.error?.message || 'Có lỗi xảy ra';
    
    return Promise.reject({
      status: response?.status,
      code: response?.data?.error?.code,
      message,
    });
  }
);

export default client;
```

### `src/api/auth.js`

```javascript
import client from './client';

export const authApi = {
  login: (username, password) => 
    client.post('/auth/login', { username, password }),
  
  logout: () => 
    client.post('/auth/logout'),
  
  getMe: () => 
    client.get('/auth/me'),
  
  changePassword: (oldPassword, newPassword) =>
    client.put('/auth/password', { 
      old_password: oldPassword, 
      new_password: newPassword 
    }),
};
```

### `src/api/users.js`

```javascript
import client from './client';

export const usersApi = {
  getAll: () => 
    client.get('/users'),
  
  getById: (id) => 
    client.get(`/users/${id}`),
  
  create: (data) => 
    client.post('/users', data),
  
  update: (id, data) => 
    client.put(`/users/${id}`, data),
  
  delete: (id) => 
    client.delete(`/users/${id}`),
  
  changeRole: (id, role) => 
    client.put(`/users/${id}/role`, { role }),
};
```

### `src/api/projects.js`

```javascript
import client from './client';

export const projectsApi = {
  getAll: () => 
    client.get('/projects'),
  
  getById: (id) => 
    client.get(`/projects/${id}`),
  
  create: (data) => 
    client.post('/projects', data),
  
  update: (id, data) => 
    client.put(`/projects/${id}`, data),
  
  delete: (id) => 
    client.delete(`/projects/${id}`),
  
  // Permissions
  getPermissions: (projectId) =>
    client.get(`/projects/${projectId}/permissions`),
  
  addPermission: (projectId, data) =>
    client.post(`/projects/${projectId}/permissions`, data),
  
  updatePermission: (projectId, userId, data) =>
    client.put(`/projects/${projectId}/permissions/${userId}`, data),
  
  removePermission: (projectId, userId) =>
    client.delete(`/projects/${projectId}/permissions/${userId}`),
};
```

### `src/api/documents.js`

```javascript
import client from './client';

export const documentsApi = {
  getAll: (projectId) => 
    client.get(`/projects/${projectId}/documents`),
  
  getById: (projectId, docId) => 
    client.get(`/projects/${projectId}/documents/${docId}`),
  
  create: (projectId, data) => 
    client.post(`/projects/${projectId}/documents`, data),
  
  update: (projectId, docId, data) => 
    client.put(`/projects/${projectId}/documents/${docId}`, data),
  
  delete: (projectId, docId) => 
    client.delete(`/projects/${projectId}/documents/${docId}`),
  
  move: (projectId, docId, parentId) =>
    client.patch(`/projects/${projectId}/documents/${docId}/move`, { parent_id: parentId }),
  
  export: (projectId, docId, format = 'html') =>
    client.get(`/projects/${projectId}/documents/${docId}/export?format=${format}`),
  
  // Tree
  getTree: (projectId) =>
    client.get(`/projects/${projectId}/tree`),
  
  updateTree: (projectId, data) =>
    client.put(`/projects/${projectId}/tree`, data),
  
  // Folders
  createFolder: (projectId, data) =>
    client.post(`/projects/${projectId}/folders`, data),
  
  updateFolder: (projectId, folderId, data) =>
    client.put(`/projects/${projectId}/folders/${folderId}`, data),
  
  deleteFolder: (projectId, folderId) =>
    client.delete(`/projects/${projectId}/folders/${folderId}`),
};
```

---

## 2.3. Contexts

### `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authApi.getMe();
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const response = await authApi.login(username, password);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### `src/contexts/ProjectContext.jsx`

```jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { documentsApi } from '../api/documents';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [currentProject, setCurrentProject] = useState(null);
  const [tree, setTree] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const loadProject = useCallback(async (project) => {
    setLoading(true);
    setCurrentProject(project);
    setPermissions(project.user_permissions || []);
    
    try {
      const treeResponse = await documentsApi.getTree(project.id);
      setTree(treeResponse.data);
    } catch (err) {
      console.error('Failed to load tree:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocument = useCallback(async (docId) => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const response = await documentsApi.getById(currentProject.id, docId);
      setCurrentDocument(response.data);
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const refreshTree = useCallback(async () => {
    if (!currentProject) return;
    
    try {
      const treeResponse = await documentsApi.getTree(currentProject.id);
      setTree(treeResponse.data);
    } catch (err) {
      console.error('Failed to refresh tree:', err);
    }
  }, [currentProject]);

  const clearProject = useCallback(() => {
    setCurrentProject(null);
    setTree(null);
    setCurrentDocument(null);
    setPermissions([]);
  }, []);

  // Permission helpers
  const canView = permissions.includes('view');
  const canCreate = permissions.includes('create');
  const canEdit = permissions.includes('edit');
  const canDelete = permissions.includes('delete');
  const canManage = permissions.includes('manage');

  const value = {
    currentProject,
    tree,
    currentDocument,
    loading,
    permissions,
    loadProject,
    loadDocument,
    refreshTree,
    clearProject,
    setCurrentDocument,
    // Permission flags
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}
```

### `src/contexts/ToastContext.jsx`

```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message) => addToast(message, 'error', 5000), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
```

---

## 2.4. Key Components

### `src/components/common/ProtectedRoute.jsx`

```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from './Loading';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

### `src/components/layout/MainLayout.jsx`

```jsx
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### `src/components/documents/DocumentTree.jsx`

```jsx
import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import TreeNode from './TreeNode';
import { FolderPlus, FilePlus } from 'lucide-react';

export default function DocumentTree() {
  const { tree, currentDocument, loadDocument, canCreate } = useProject();
  const [expandedFolders, setExpandedFolders] = useState(['root']);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  if (!tree) {
    return <div className="p-4 text-slate-500">Đang tải...</div>;
  }

  const renderNodes = (nodeIds, depth = 0) => {
    return nodeIds.map(nodeId => {
      const node = tree.nodes[nodeId] || 
        (nodeId === 'root' ? tree.root : null);
      
      if (!node) return null;

      const isExpanded = expandedFolders.includes(nodeId);
      const isActive = currentDocument?.id === nodeId;

      return (
        <TreeNode
          key={nodeId}
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          isActive={isActive}
          onToggle={() => toggleFolder(nodeId)}
          onClick={() => node.type === 'file' && loadDocument(nodeId)}
        >
          {node.type === 'folder' && isExpanded && node.children?.length > 0 && (
            <div className="ml-4">
              {renderNodes(node.children, depth + 1)}
            </div>
          )}
        </TreeNode>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Actions */}
      {canCreate && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100">
            <FilePlus size={16} />
            Tài liệu
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100">
            <FolderPlus size={16} />
            Thư mục
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderNodes(tree.root.children)}
        
        {tree.root.children.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p>Chưa có tài liệu nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### `src/components/editor/QuillEditor.jsx`

```jsx
import { useRef, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'align',
  'list', 'bullet',
  'blockquote', 'code-block',
  'link', 'image',
];

export default function QuillEditor({ 
  value, 
  onChange, 
  readOnly = false,
  placeholder = 'Bắt đầu viết...' 
}) {
  const quillRef = useRef(null);

  const handleChange = useCallback((content, delta, source, editor) => {
    if (source === 'user') {
      onChange(editor.getContents());
    }
  }, [onChange]);

  return (
    <div className="quill-wrapper h-full">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
        placeholder={placeholder}
        className="h-full"
      />
    </div>
  );
}
```

---

## 2.5. Pages

### `src/pages/LoginPage.jsx`

```jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FilePen, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      showError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <FilePen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Docupedia
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống quản lý tài liệu
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Nhập tên đăng nhập"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Phiên bản 2.0 • © 2026 Docupedia
        </p>
      </div>
    </div>
  );
}
```

### `src/pages/DashboardPage.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { projectsApi } from '../api/projects';
import MainLayout from '../components/layout/MainLayout';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm';
import { Plus, FolderOpen } from 'lucide-react';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (err) {
      error('Không thể tải danh sách project');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (data) => {
    try {
      const response = await projectsApi.create(data);
      setProjects(prev => [...prev, response.data]);
      setShowForm(false);
      success('Tạo project thành công');
    } catch (err) {
      error(err.message);
    }
  };

  const handleOpenProject = (project) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dự án của bạn
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {projects.length} dự án
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md"
          >
            <Plus size={20} />
            Tạo dự án mới
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Đang tải...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Chưa có dự án nào
          </h3>
          <p className="text-slate-500 dark:text-slate-500 mt-1">
            {isAdmin ? 'Tạo dự án đầu tiên để bắt đầu' : 'Liên hệ admin để được cấp quyền'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleOpenProject(project)}
            />
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowForm(false)}
        />
      )}
    </MainLayout>
  );
}
```

### `src/pages/ProjectPage.jsx`

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { projectsApi } from '../api/projects';
import { documentsApi } from '../api/documents';
import DocumentTree from '../components/documents/DocumentTree';
import DocumentEditor from '../components/documents/DocumentEditor';
import { ArrowLeft, Save, Eye, Edit } from 'lucide-react';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const { 
    currentProject, 
    currentDocument, 
    loadProject, 
    loadDocument,
    refreshTree,
    setCurrentDocument,
    canEdit 
  } = useProject();
  
  const [viewMode, setViewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load project on mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectsApi.getById(projectId);
        loadProject(response.data);
      } catch (err) {
        error('Không thể tải project');
        navigate('/');
      }
    };
    
    fetchProject();
  }, [projectId]);

  // Handle content change
  const handleContentChange = useCallback((content) => {
    setCurrentDocument(prev => ({ ...prev, content }));
    setHasChanges(true);
  }, [setCurrentDocument]);

  // Save document
  const handleSave = async () => {
    if (!currentDocument || !hasChanges) return;
    
    setSaving(true);
    try {
      await documentsApi.update(projectId, currentDocument.id, {
        title: currentDocument.title,
        content: currentDocument.content
      });
      setHasChanges(false);
      success('Đã lưu tài liệu');
    } catch (err) {
      error('Lỗi khi lưu tài liệu');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [hasChanges, currentDocument]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, currentDocument]);

  if (!currentProject) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white">
              {currentProject.name}
            </h1>
            {currentDocument && (
              <p className="text-sm text-slate-500">{currentDocument.title}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600">Chưa lưu</span>
          )}
          
          {canEdit && currentDocument && (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              
              <button
                onClick={() => setViewMode(!viewMode)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                {viewMode ? <Edit size={16} /> : <Eye size={16} />}
                {viewMode ? 'Sửa' : 'Xem'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Document Tree */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
          <DocumentTree />
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-hidden">
          {currentDocument ? (
            <DocumentEditor
              document={currentDocument}
              onChange={handleContentChange}
              readOnly={viewMode || !canEdit}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>Chọn một tài liệu để bắt đầu</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

---

## 2.6. App Entry Point

### `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';
import ToastContainer from './components/common/ToastContainer';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProjectProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/projects/:projectId" element={<ProjectPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  
                  {/* Admin only */}
                  <Route element={<AdminRoute />}>
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                </Route>
                
                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              
              <ToastContainer />
            </ProjectProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

### `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

# 3. Database Schema

Xem chi tiết tại [architecture.md](architecture.md#5-data-models-json-schemas)

---

# 4. Error Handling

## 4.1. Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ |
| `AUTH_FAILED` | 401 | Đăng nhập thất bại |
| `INVALID_TOKEN` | 401 | Token không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa xác thực |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `PERMISSION_DENIED` | 403 | Không có quyền thực hiện thao tác |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `CONFLICT` | 409 | Xung đột dữ liệu (vd: username đã tồn tại) |
| `SERVER_ERROR` | 500 | Lỗi server |

---

# 5. Environment Variables

## `.env.example`

```bash
# Flask
FLASK_ENV=development
FLASK_DEBUG=true

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_EXPIRATION_HOURS=24

# Data
DATA_DIR=/app/docupedia_data

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Vite (Frontend)
VITE_API_URL=/api/v1
```

---

*Cập nhật lần cuối: 2026-06-02*
