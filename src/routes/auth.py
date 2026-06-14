from flask import request
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import auth_bp
from services.auth_service import AuthService
from middleware.auth_middleware import require_auth, get_current_user
from utils.response import success_response, error_response
from utils.validators import validate_login, validate_password_change


@auth_bp.route('/login', methods=['POST'])
def login():
    """POST /api/v1/auth/login - User login"""
    data = request.get_json()
    
    # Validate input
    is_valid, error = validate_login(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    # Attempt login
    success, user_data, result = AuthService.login(
        data['username'],
        data['password']
    )
    
    if success:
        return success_response({
            'token': result,
            'user': user_data
        }, 'Đăng nhập thành công')
    else:
        return error_response(result, 'AUTH_FAILED', 401)


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """POST /api/v1/auth/logout - User logout"""
    return success_response(None, 'Đăng xuất thành công')


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """GET /api/v1/auth/me - Get current user info"""
    user = get_current_user()
    return success_response(user)


@auth_bp.route('/password', methods=['PUT'])
@require_auth
def change_password():
    """PUT /api/v1/auth/password - Change password"""
    data = request.get_json()
    user = get_current_user()
    
    # Validate input
    is_valid, error = validate_password_change(data)
    if not is_valid:
        return error_response(error, 'VALIDATION_ERROR', 400)
    
    # Change password
    success, message = AuthService.change_password(
        user['id'],
        data['old_password'],
        data['new_password']
    )
    
    if success:
        return success_response(None, message)
    else:
        return error_response(message, 'PASSWORD_CHANGE_FAILED', 400)
