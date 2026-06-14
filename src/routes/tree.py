from flask import request
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import projects_bp
from services.tree_service import TreeService
from services.project_service import ProjectService
from middleware.auth_middleware import require_auth, get_current_user, optional_auth
from middleware.permission_middleware import get_user_permissions
from utils.response import success_response, error_response


@projects_bp.route('/<project_id>/tree', methods=['GET'])
@optional_auth
def get_tree(project_id):
    """GET /api/v1/projects/:projectId/tree - Get tree structure"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    tree = TreeService.get_tree(project_id)
    if not tree:
        return error_response('Không tìm thấy tree', 'NOT_FOUND', 404)
    return success_response(tree)


@projects_bp.route('/<project_id>/tree', methods=['PUT'])
@require_auth
def update_tree(project_id):
    """PUT /api/v1/projects/:projectId/tree - Update tree structure"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền chỉnh sửa', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    success = TreeService.save_tree(project_id, data)
    if success:
        tree = TreeService.get_tree(project_id)
        return success_response(tree, 'Cập nhật cấu trúc thành công')
    else:
        return error_response('Có lỗi xảy ra', 'UPDATE_FAILED', 400)
