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
        
    lock_info = DocumentService.get_lock_info(project_id, doc_id)
    document['lock_info'] = lock_info
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


@projects_bp.route('/<project_id>/documents/<doc_id>/comments', methods=['GET'])
@optional_auth
def get_document_comments(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id/comments - Get document comments"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = []
    if user:
        permissions = get_user_permissions(user['id'], project_id, user.get('role'))
        
    has_project_access = ('view' in permissions) or (project and project.get('is_public'))
    if not has_project_access:
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
        
    has_comments_access = ('view' in permissions) or (project and project.get('is_public') and project.get('allow_public_comments', False))
    if not has_comments_access:
        return error_response('Bình luận của dự án này không được công khai', 'PERMISSION_DENIED', 403)
        
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
        
    comments = DocumentService.get_comments(project_id, doc_id)
    return success_response(comments)


@projects_bp.route('/<project_id>/documents/<doc_id>/comments', methods=['POST'])
@require_auth
def add_document_comment(project_id, doc_id):
    """POST /api/v1/projects/:projectId/documents/:id/comments - Add a comment"""
    user = get_current_user()
    project = ProjectService.get_project_by_id(project_id)
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'view' not in permissions and (not project or not project.get('is_public')):
        return error_response('Không có quyền truy cập', 'PERMISSION_DENIED', 403)
        
    data = request.get_json() or {}
    content = data.get('content', '').strip()
    parent_id = data.get('parent_id')
    if not content:
        return error_response('Nội dung bình luận không được để trống', 'VALIDATION_ERROR', 400)
        
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
        
    success, result = DocumentService.add_comment(project_id, doc_id, content, user['id'], parent_id)
    if success:
        return success_response(result, 'Thêm bình luận thành công', 201)
    return error_response(result, 'ADD_COMMENT_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>/comments/<comment_id>', methods=['PUT'])
@require_auth
def update_document_comment(project_id, doc_id, comment_id):
    """PUT /api/v1/projects/:projectId/documents/:id/comments/:commentId - Update comment"""
    user = get_current_user()
    
    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return error_response('Nội dung bình luận không được để trống', 'VALIDATION_ERROR', 400)
        
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
        
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    is_admin_or_manage = user.get('role') == 'admin' or 'manage' in permissions or 'edit' in permissions
    
    success, result = DocumentService.update_comment(
        project_id, doc_id, comment_id, content, user['id'], is_admin_or_manage
    )
    if success:
        return success_response(result, 'Cập nhật bình luận thành công')
    return error_response(result, 'UPDATE_COMMENT_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>/comments/<comment_id>', methods=['DELETE'])
@require_auth
def delete_document_comment(project_id, doc_id, comment_id):
    """DELETE /api/v1/projects/:projectId/documents/:id/comments/:commentId - Delete comment"""
    user = get_current_user()
    
    document = DocumentService.get_document(project_id, doc_id)
    if not document:
        return error_response('Không tìm thấy tài liệu', 'NOT_FOUND', 404)
        
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    is_admin_or_manage = user.get('role') == 'admin' or 'manage' in permissions or 'edit' in permissions
    
    success, result = DocumentService.delete_comment(
        project_id, doc_id, comment_id, user['id'], is_admin_or_manage
    )
    if success:
        return success_response(None, result)
    return error_response(result, 'DELETE_COMMENT_FAILED', 400)


@projects_bp.route('/<project_id>/documents/<doc_id>/history', methods=['GET'])
@optional_auth
def get_document_history(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id/history - Get document history"""
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
        
    history = DocumentService.get_history(project_id, doc_id)
    return success_response(history)


@projects_bp.route('/<project_id>/documents/<doc_id>/lock', methods=['GET'])
@optional_auth
def get_document_lock_status(project_id, doc_id):
    """GET /api/v1/projects/:projectId/documents/:id/lock - Get document lock status"""
    project = ProjectService.get_project_by_id(project_id)
    if not project:
        return error_response('Không tìm thấy dự án', 'NOT_FOUND', 404)
        
    lock_info = DocumentService.get_lock_info(project_id, doc_id)
    return success_response(lock_info)


@projects_bp.route('/<project_id>/documents/<doc_id>/lock', methods=['POST'])
@require_auth
def lock_document(project_id, doc_id):
    """POST /api/v1/projects/:projectId/documents/:id/lock - Lock a document for editing"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền chỉnh sửa', 'PERMISSION_DENIED', 403)
        
    success, lock_info = DocumentService.acquire_lock(project_id, doc_id, user['id'])
    if success:
        return success_response(lock_info, 'Khóa tài liệu thành công')
    else:
        from flask import jsonify
        return jsonify({
            'success': False,
            'error': {
                'code': 'DOCUMENT_LOCKED',
                'message': f"Tài liệu đang bị khóa chỉnh sửa bởi {lock_info['locked_by_name']}",
                'lock_info': lock_info
            }
        }), 409


@projects_bp.route('/<project_id>/documents/<doc_id>/unlock', methods=['POST'])
@require_auth
def unlock_document(project_id, doc_id):
    """POST /api/v1/projects/:projectId/documents/:id/unlock - Release document edit lock"""
    user = get_current_user()
    
    permissions = get_user_permissions(user['id'], project_id, user.get('role'))
    if 'edit' not in permissions:
        return error_response('Không có quyền chỉnh sửa', 'PERMISSION_DENIED', 403)
        
    is_admin = user.get('role') == 'admin' or 'manage' in permissions
    
    lock_info = DocumentService.get_lock_info(project_id, doc_id)
    if not lock_info:
        return success_response(None, 'Tài liệu không bị khóa')
        
    if lock_info['locked_by'] == user['id'] or is_admin:
        DocumentService.release_lock(project_id, doc_id, lock_info['locked_by'])
        return success_response(None, 'Mở khóa tài liệu thành công')
        
    return error_response('Bạn không có quyền mở khóa tài liệu này', 'PERMISSION_DENIED', 403)


@projects_bp.route('/<project_id>/documents/<doc_id>/heartbeat', methods=['POST'])
@require_auth
def heartbeat_document_lock(project_id, doc_id):
    """POST /api/v1/projects/:projectId/documents/:id/heartbeat - Refresh document edit lock"""
    user = get_current_user()
    
    lock_info = DocumentService.get_lock_info(project_id, doc_id)
    if not lock_info:
        return error_response('Tài liệu không bị khóa hoặc khóa đã hết hạn', 'LOCK_EXPIRED', 400)
        
    if lock_info['locked_by'] != user['id']:
        return error_response('Khóa thuộc về người dùng khác', 'PERMISSION_DENIED', 403)
        
    success, result = DocumentService.acquire_lock(project_id, doc_id, user['id'])
    if success:
        return success_response(result, 'Gia hạn khóa thành công')
    else:
        if isinstance(result, dict) and result.get('error_code') == 'LOCK_SESSION_EXPIRED':
            return error_response(result['message'], 'LOCK_SESSION_EXPIRED', 403)
        return error_response('Không thể gia hạn khóa', 'HEARTBEAT_FAILED', 400)
