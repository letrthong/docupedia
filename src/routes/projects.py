from flask import request, g
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import projects_bp
from services.project_service import ProjectService
from services.permission_service import PermissionService
from middleware.auth_middleware import require_auth, require_admin, get_current_user, optional_auth
from middleware.permission_middleware import require_permission, get_user_permissions
from utils.response import success_response, error_response
from utils.validators import validate_project, validate_permission


@projects_bp.route('', methods=['GET'])
@optional_auth
def get_projects():
    """GET /api/v1/projects - Get user's accessible projects"""
    user = get_current_user()
    if not user:
        return success_response([])
    projects = ProjectService.get_user_projects(user['id'], user['role'])
    return success_response(projects)


@projects_bp.route('/<project_id>', methods=['GET'])
@optional_auth
def get_project(project_id):
    """GET /api/v1/projects/:id - Get project details"""
    user = get_current_user()
    
    project = ProjectService.get_project_by_id(project_id)
    if not project:
        return error_response('Không tìm thấy project', 'NOT_FOUND', 404)

    # Check permission
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    elif project.get('is_public'):
        permissions = ['view']
        
    if 'view' not in permissions and not project.get('is_public'):
        return error_response('Bạn không có quyền truy cập project này', 'PERMISSION_DENIED', 403)
    
    project['user_permissions'] = permissions
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
def update_project(project_id):
    """PUT /api/v1/projects/:id - Update project"""
    user = get_current_user()
    
    # Check permission
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'manage' not in permissions:
        return error_response('Bạn không có quyền chỉnh sửa project này', 'PERMISSION_DENIED', 403)
    
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


# ========== Permission Routes ==========

@projects_bp.route('/<project_id>/permissions', methods=['GET'])
@require_auth
def get_project_permissions(project_id):
    """GET /api/v1/projects/:id/permissions - Get project permissions"""
    user = get_current_user()
    
    # Check permission
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'manage' not in permissions and user.get('role') != 'admin':
        return error_response('Bạn không có quyền xem permissions', 'PERMISSION_DENIED', 403)
    
    perms = PermissionService.get_project_permissions(project_id)
    return success_response(perms)


@projects_bp.route('/<project_id>/permissions', methods=['POST'])
@optional_auth
def add_project_permission(project_id):
    """POST /api/v1/projects/:id/permissions - Add permission"""
    user = get_current_user()
    
    if not user:
        return error_response('Bạn không có quyền xem permissions', 'PERMISSION_DENIED', 403)
        
    # Check permission
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'manage' not in permissions and user.get('role') != 'admin':
        return error_response('Bạn không có quyền thêm permissions', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    is_valid, error = validate_permission(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = PermissionService.grant_permission(
        project_id, 
        data['user_id'], 
        data.get('permissions', ['view']),
        user['id']
    )
    if success:
        return success_response(result, 'Thêm quyền thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@projects_bp.route('/<project_id>/permissions/<user_id>', methods=['PUT'])
@require_auth
def update_project_permission(project_id, user_id):
    """PUT /api/v1/projects/:id/permissions/:userId - Update permission"""
    current_user = get_current_user()
    
    # Check permission
    permissions = get_user_permissions(current_user['id'], project_id, current_user.get('role'))
    if 'manage' not in permissions and current_user.get('role') != 'admin':
        return error_response('Bạn không có quyền sửa permissions', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    success, result = PermissionService.update_permission(
        project_id, user_id, data.get('permissions', [])
    )
    if success:
        return success_response(result, 'Cập nhật quyền thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@projects_bp.route('/<project_id>/permissions/<user_id>', methods=['DELETE'])
@require_auth
def delete_project_permission(project_id, user_id):
    """DELETE /api/v1/projects/:id/permissions/:userId - Delete permission"""
    current_user = get_current_user()
    
    # Check permission
    permissions = get_user_permissions(current_user['id'], project_id, current_user.get('role'))
    if 'manage' not in permissions and current_user.get('role') != 'admin':
        return error_response('Bạn không có quyền xóa permissions', 'PERMISSION_DENIED', 403)
    
    success, message = PermissionService.revoke_permission(project_id, user_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)
