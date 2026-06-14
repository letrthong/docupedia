import os
import sys
from typing import List, Dict, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config_doupedia()


class PermissionService:
    """Permission management service"""
    
    @staticmethod
    def get_user_permissions(user_id: str, project_id: str, user_role: str = None) -> List[str]:
        """Get user's permissions for a project"""
        # Admin has all permissions
        if user_role == 'admin':
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
    
    @staticmethod
    def get_project_permissions(project_id: str) -> List[Dict]:
        """Get all permissions for a project"""
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        return [p for p in permissions if p['project_id'] == project_id]
    
    @staticmethod
    def grant_permission(project_id: str, user_id: str, permissions: List[str], 
                        granted_by: str) -> Tuple[bool, any]:
        """Grant permissions to a user for a project"""
        # Check if user exists
        from services.user_service import UserService
        user = UserService.get_user_by_id(user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
        
        # Check if project exists
        from services.project_service import ProjectService
        project = ProjectService.get_project_by_id(project_id)
        if not project:
            return False, "Không tìm thấy project"
        
        # Check if permission already exists
        existing = None
        all_permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        for p in all_permissions:
            if p['user_id'] == user_id and p['project_id'] == project_id:
                existing = p
                break
        
        if existing:
            # Update existing permission
            success = JSONStorage.update_in_list(
                config.PERMISSIONS_FILE, 'permissions', existing['id'],
                {'permissions': permissions, 'granted_by': granted_by}
            )
            if success:
                return True, {**existing, 'permissions': permissions}
            return False, "Có lỗi xảy ra"
        
        # Create new permission
        perm = {
            'id': generate_id('perm'),
            'user_id': user_id,
            'project_id': project_id,
            'permissions': permissions,
            'granted_by': granted_by,
            'granted_at': get_timestamp()
        }
        
        JSONStorage.append_to_list(config.PERMISSIONS_FILE, 'permissions', perm)
        return True, perm
    
    @staticmethod
    def update_permission(project_id: str, user_id: str, permissions: List[str]) -> Tuple[bool, any]:
        """Update user's permissions for a project"""
        all_permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        
        for p in all_permissions:
            if p['user_id'] == user_id and p['project_id'] == project_id:
                success = JSONStorage.update_in_list(
                    config.PERMISSIONS_FILE, 'permissions', p['id'],
                    {'permissions': permissions}
                )
                if success:
                    return True, {**p, 'permissions': permissions}
                return False, "Có lỗi xảy ra"
        
        return False, "Không tìm thấy quyền"
    
    @staticmethod
    def revoke_permission(project_id: str, user_id: str) -> Tuple[bool, str]:
        """Revoke all permissions for a user on a project"""
        all_permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        
        for p in all_permissions:
            if p['user_id'] == user_id and p['project_id'] == project_id:
                success = JSONStorage.delete_from_list(
                    config.PERMISSIONS_FILE, 'permissions', p['id']
                )
                if success:
                    return True, "Đã xóa quyền thành công"
                return False, "Có lỗi xảy ra"
        
        return False, "Không tìm thấy quyền"
    
    @staticmethod
    def check_permission(user_id: str, project_id: str, required: str, user_role: str = None) -> bool:
        """Check if user has specific permission"""
        permissions = PermissionService.get_user_permissions(user_id, project_id, user_role)
        return required in permissions
