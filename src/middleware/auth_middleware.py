from functools import wraps
from flask import request, g
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import AuthService
from utils.response import error_response


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return error_response('Token không hợp lệ', 'INVALID_TOKEN', 401)
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Verify token and get user
        user = AuthService.get_user_from_token(token)
        
        if not user:
            return error_response('Token hết hạn hoặc không hợp lệ', 'UNAUTHORIZED', 401)
        
        # Store user in flask.g for access in route handlers
        g.current_user = user
        
        return f(*args, **kwargs)
    
    return decorated


def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # First check authentication
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return error_response('Token không hợp lệ', 'INVALID_TOKEN', 401)
        
        token = auth_header[7:]
        user = AuthService.get_user_from_token(token)
        
        if not user:
            return error_response('Token hết hạn hoặc không hợp lệ', 'UNAUTHORIZED', 401)
        
        # Check admin role
        if user.get('role') != 'admin':
            return error_response('Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN', 403)
        
        g.current_user = user
        return f(*args, **kwargs)
    
    return decorated


def get_current_user():
    """Get current authenticated user from flask.g"""
    return getattr(g, 'current_user', None)


def optional_auth(f):
    """Decorator to optionally authenticate a user"""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            user = AuthService.get_user_from_token(token)
            
            if user:
                g.current_user = user
                
        return f(*args, **kwargs)
    
    return decorated
