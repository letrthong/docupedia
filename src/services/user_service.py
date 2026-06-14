import os
import sys
from typing import List, Dict, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from services.auth_service import AuthService
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config_doupedia()


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
    def _sanitize_user(user: Dict) -> Optional[Dict]:
        """Remove sensitive fields from user object"""
        if not user:
            return None
        return {k: v for k, v in user.items() if k != 'password_hash'}
