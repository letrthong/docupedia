import re
from typing import Tuple, Dict


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
