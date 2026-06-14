from jwt import encode, decode, ExpiredSignatureError, InvalidTokenError
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from typing import Optional, Dict, Tuple

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config_doupedia()


class AuthService:
    """Authentication service - handles login, JWT, password hashing"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using Werkzeug security"""
        return generate_password_hash(password)
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return check_password_hash(password_hash, password)
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
        token = encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)
        if isinstance(token, bytes):
            return token.decode('utf-8')
        return token
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode and verify JWT token"""
        try:
            payload = decode(
                token, 
                config.JWT_SECRET_KEY, 
                algorithms=[config.JWT_ALGORITHM]
            )
            return payload
        except ExpiredSignatureError:
            return None  # Token expired
        except InvalidTokenError:
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
            return False, None, "Tên đăng nhập không tồn tại"
        
        if not user.get('is_active', True):
            return False, None, "Tài khoản đã bị vô hiệu hóa"
        
        # Verify password
        if not cls.verify_password(password, user.get('password_hash', '')):
            return False, None, "Mật khẩu không chính xác"
        
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
    # Create data directory
    os.makedirs(config.DATA_DIR, exist_ok=True)
    
    # Check if users file exists and has users
    if os.path.exists(config.USERS_FILE):
        users = JSONStorage.get_list(config.USERS_FILE, 'users')
        if users:
            print(f"[Init] Users file exists with {len(users)} users")
            return
    
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
    
    # Also initialize empty projects and permissions files
    if not os.path.exists(config.PROJECTS_FILE):
        JSONStorage.write(config.PROJECTS_FILE, {'projects': []})
        print("[Init] Created empty projects.json")
    
    if not os.path.exists(config.PERMISSIONS_FILE):
        JSONStorage.write(config.PERMISSIONS_FILE, {'permissions': []})
        print("[Init] Created empty permissions.json")
    
    # Create projects data directory
    os.makedirs(config.PROJECTS_DATA_DIR, exist_ok=True)
    print(f"[Init] Data directory ready: {config.DATA_DIR}")
