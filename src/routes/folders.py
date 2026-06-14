from flask import request
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import projects_bp
from services.folder_service import FolderService
from services.project_service import ProjectService
from middleware.auth_middleware import require_auth, get_current_user, optional_auth
from middleware.permission_middleware import get_user_permissions
from utils.response import success_response, error_response
from utils.validators import validate_folder


@projects_bp.route('/<project_id>/folders', methods=['GET'])
@optional_auth
def get_folders(project_id):
    """GET /api/v1/projects/:projectId/folders - Get all folders"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    folders = FolderService.get_all_folders(project_id)
    return success_response(folders)


@projects_bp.route('/<project_id>/folders/<folder_id>', methods=['GET'])
@optional_auth
def get_folder(project_id, folder_id):
    """GET /api/v1/projects/:projectId/folders/:id - Get folder"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    folder = FolderService.get_folder(project_id, folder_id)
    if not folder:
        return error_response('Không tìm thấy thư mục', 'NOT_FOUND', 404)
    return success_response(folder)


@projects_bp.route('/<project_id>/folders', methods=['POST'])
@require_auth
def create_folder(project_id):
    """POST /api/v1/projects/:projectId/folders - Create folder"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'create' not in permissions:
        return error_response('Không có quyền tạo thư mục', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    is_valid, error = validate_folder(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = FolderService.create_folder(project_id, data, user['id'])
    if success:
        return success_response(result, 'Tạo thư mục thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@projects_bp.route('/<project_id>/folders/<folder_id>', methods=['PUT'])
@require_auth
def update_folder(project_id, folder_id):
    """PUT /api/v1/projects/:projectId/folders/:id - Update folder"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền chỉnh sửa', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    success, result = FolderService.update_folder(project_id, folder_id, data)
    if success:
        return success_response(result, 'Cập nhật thư mục thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@projects_bp.route('/<project_id>/folders/<folder_id>', methods=['DELETE'])
@require_auth
def delete_folder(project_id, folder_id):
    """DELETE /api/v1/projects/:projectId/folders/:id - Delete folder"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'delete' not in permissions:
        return error_response('Không có quyền xóa', 'PERMISSION_DENIED', 403)
    
    success, message = FolderService.delete_folder(project_id, folder_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)
