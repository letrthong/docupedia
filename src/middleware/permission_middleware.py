from functools import wraps
from flask import g
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.permission_service import PermissionService
from utils.response import error_response


def get_user_permissions(user_id: str, project_id: str, user_role: str = None) -> list:
    """Get user's permissions for a project"""
    return PermissionService.get_user_permissions(user_id, project_id, user_role)


def check_permission(user_id: str, project_id: str, required: str, user_role: str = None) -> bool:
    """Check if user has specific permission"""
    return PermissionService.check_permission(user_id, project_id, required, user_role)


def require_permission(required_permissions: list):
    """Decorator factory to require specific permissions on a project"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            project_id = kwargs.get('project_id')
            
            if not project_id:
                return error_response('Project ID không hợp lệ', 'INVALID_PROJECT', 400)
            
            user = getattr(g, 'current_user', None)
            if not user:
                return error_response('Chưa xác thực', 'UNAUTHORIZED', 401)
            
            user_permissions = get_user_permissions(user['id'], project_id, user.get('role'))
            
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
