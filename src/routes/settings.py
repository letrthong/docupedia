from flask import request
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import settings_bp
from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage
from middleware.auth_middleware import require_auth, get_current_user
from utils.response import success_response, error_response

config = get_config_doupedia()


@settings_bp.route('', methods=['GET'])
def get_settings():
    """GET /api/v1/docupedia/settings - Get global settings"""
    settings_file = os.path.join(config.ROOT_DATABASE_DIR, 'settings.json')
    settings = JSONStorage.read(settings_file)
    # Default values
    if 'max_session_duration_minutes' not in settings:
        settings['max_session_duration_minutes'] = 30
    return success_response(settings)


@settings_bp.route('', methods=['PUT'])
@require_auth
def update_settings():
    """PUT /api/v1/docupedia/settings - Update global settings (admin only)"""
    user = get_current_user()
    if user.get('role') != 'admin':
        return error_response('Chỉ admin mới có quyền thay đổi cấu hình hệ thống', 'PERMISSION_DENIED', 403)
        
    data = request.get_json() or {}
    max_duration = data.get('max_session_duration_minutes')
    
    if max_duration not in [15, 30, 60]:
        return error_response('Thời gian chỉnh sửa chỉ được chọn 15, 30 hoặc 60 phút', 'VALIDATION_ERROR', 400)
        
    settings_file = os.path.join(config.ROOT_DATABASE_DIR, 'settings.json')
    settings = JSONStorage.read(settings_file)
    settings['max_session_duration_minutes'] = max_duration
    
    JSONStorage.write(settings_file, settings)
    
    return success_response(settings, 'Cập nhật cấu hình thành công')
