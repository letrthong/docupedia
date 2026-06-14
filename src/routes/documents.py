from flask import request, g
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import projects_bp
from services.document_service import DocumentService
from services.project_service import ProjectService
from middleware.auth_middleware import require_auth, get_current_user, optional_auth
from middleware.permission_middleware import get_user_permissions
from utils.response import success_response, error_response
from utils.validators import validate_document


@projects_bp.route('/<project_id>/documents', methods=['GET'])
@optional_auth
def get_documents(project_id):
    """GET /api/v1/projects/:projectId/documents - Get all documents"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    documents = DocumentService.get_all_documents(project_id)
    return success_response(documents)


@projects_bp.route('/<project_id>/documents/<doc_id>', methods=['GET'])
@optional_auth
def get_document(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id - Get document"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
    return success_response(document)


@projects_bp.route('/<project_id>/documents', methods=['POST'])
@require_auth
def create_document(project_id):
    """POST /api/v1/projects/:projectId/documents - Create document"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'create' not in permissions:
        return error_response('Không có quyền tạo tài liệu', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    is_valid, error = validate_document(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.create_document(project_id, data, user['id'])
    if success:
        return success_response(result, 'Tạo tài liệu thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>', methods=['PUT'])
@require_auth
def update_document(project_id, doc_id):
    """PUT /api/v1/projects/:projectId/documents/:id - Update document"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền chỉnh sửa', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    success, result = DocumentService.update_document(project_id, doc_id, data, user['id'])
    if success:
        return success_response(result, 'Cập nhật tài liệu thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>', methods=['DELETE'])
@require_auth
def delete_document(project_id, doc_id):
    """DELETE /api/v1/projects/:projectId/documents/:id - Delete document"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'delete' not in permissions:
        return error_response('Không có quyền xóa', 'PERMISSION_DENIED', 403)
    
    success, message = DocumentService.delete_document(project_id, doc_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>/move', methods=['PATCH'])
@require_auth
def move_document(project_id, doc_id):
    """PATCH /api/v1/projects/:projectId/documents/:id/move - Move document"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền di chuyển', 'PERMISSION_DENIED', 403)
    
    data = request.get_json()
    new_parent_id = data.get('parent_id')
    
    if not new_parent_id:
        return error_response('parent_id là bắt buộc', 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.move_document(project_id, doc_id, new_parent_id)
    if success:
        return success_response(result, 'Di chuyển tài liệu thành công')
    else:
        return error_response(result, 'MOVE_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>/export', methods=['GET'])
@optional_auth
def export_document(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id/export - Export document"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
    
    format_type = request.args.get('format', 'html')
    
    if format_type not in ['html', 'txt']:
        return error_response('Format không hỗ trợ', 'VALIDATION_ERROR', 400)
    
    success, result = DocumentService.export_document(project_id, doc_id, format_type)
    if success:
        return success_response(result)
    else:
        return error_response(result, 'EXPORT_FAILED', 400)
