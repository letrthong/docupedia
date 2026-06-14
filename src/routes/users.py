from flask import request
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import users_bp
from services.user_service import UserService
from middleware.auth_middleware import require_admin
from utils.response import success_response, error_response
from utils.validators import validate_user_create, validate_user_update


@users_bp.route('', methods=['GET'])
@require_admin
def get_users():
    """GET /api/v1/users - Get all users (Admin only)"""
    users = UserService.get_all_users()
    return success_response(users)


@users_bp.route('/<user_id>', methods=['GET'])
@require_admin
def get_user(user_id):
    """GET /api/v1/users/:id - Get user by ID (Admin only)"""
    user = UserService.get_user_by_id(user_id)
    if not user:
        return error_response('Không tìm thấy người dùng', 'NOT_FOUND', 404)
    return success_response(user)


@users_bp.route('', methods=['POST'])
@require_admin
def create_user():
    """POST /api/v1/users - Create new user (Admin only)"""
    data = request.get_json()
    
    is_valid, error = validate_user_create(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = UserService.create_user(data)
    if success:
        return success_response(result, 'Tạo người dùng thành công', 201)
    else:
        return error_response(result, 'CREATE_FAILED', 400)


@users_bp.route('/<user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    """PUT /api/v1/users/:id - Update user (Admin only)"""
    data = request.get_json()
    
    is_valid, error = validate_user_update(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    success, result = UserService.update_user(user_id, data)
    if success:
        return success_response(result, 'Cập nhật người dùng thành công')
    else:
        return error_response(result, 'UPDATE_FAILED', 400)


@users_bp.route('/<user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """DELETE /api/v1/users/:id - Delete user (Admin only)"""
    success, message = UserService.delete_user(user_id)
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'DELETE_FAILED', 400)


@users_bp.route('/<user_id>/role', methods=['PUT'])
@require_admin
def change_user_role(user_id):
    """PUT /api/v1/users/:id/role - Change user role (Admin only)"""
    data = request.get_json()
    role = data.get('role')
    
    if role not in ['admin', 'user']:
        return error_response('Role không hợp lệ', 'VALIDATION_ERROR', 400)
    
    success, result = UserService.change_role(user_id, role)
    if success:
        return success_response(result, 'Thay đổi role thành công')
    else:
        return error_response(result, 'ROLE_CHANGE_FAILED', 400)
