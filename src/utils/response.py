from flask import jsonify
from typing import Any


def success_response(data: Any = None, message: str = "Thành công", status_code: int = 200):
    """Create success response"""
    response = {
        'success': True,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(message: str, error_code: str = "ERROR", status_code: int = 400):
    """Create error response"""
    return jsonify({
        'success': False,
        'error': {
            'code': error_code,
            'message': message
        }
    }), status_code


def paginated_response(data: list, page: int, per_page: int, total: int):
    """Create paginated response"""
    return jsonify({
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page
        }
    }), 200
