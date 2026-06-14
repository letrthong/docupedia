import os
import sys
from flask import Blueprint, jsonify

# Đảm bảo thư mục src của Docupedia nằm trong sys.path để các imports bên dưới hoạt động đúng
DOCUPEDIA_SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if DOCUPEDIA_SRC_DIR not in sys.path:
    sys.path.insert(0, DOCUPEDIA_SRC_DIR)

from services.auth_service import init_default_admin

# Bắt buộc import các file route handlers để logic được đính kèm vào các blueprints
from routes import auth, users, projects, permissions, documents, folders, tree
from routes import (
    auth_bp, users_bp, projects_bp, permissions_bp,
    documents_bp, folders_bp, tree_bp
)

# Khởi tạo Blueprint cha (Unified Blueprint) chứa toàn bộ API
docupedia_bp = Blueprint('docupedia_restful', __name__)

# Thêm Health Check endpoint trực tiếp vào Blueprint
# @docupedia_bp.route('/health', methods=['GET'])
# def health_check():
#     """GET /health - Health check endpoint"""
#     return jsonify({
#         'success': True,
#         'data': {'status': 'ok', 'version': '1.0.0'}
#     })

# Gắn (nest) các blueprints con vào Blueprint cha
docupedia_bp.register_blueprint(auth_bp, url_prefix='/auth')
docupedia_bp.register_blueprint(users_bp, url_prefix='/users')
docupedia_bp.register_blueprint(projects_bp, url_prefix='/projects')
docupedia_bp.register_blueprint(permissions_bp, url_prefix='/projects')
docupedia_bp.register_blueprint(documents_bp, url_prefix='/projects')
docupedia_bp.register_blueprint(folders_bp, url_prefix='/projects')
docupedia_bp.register_blueprint(tree_bp, url_prefix='/projects')

def init_docupedia_db():
    """Khởi tạo dữ liệu và tài khoản admin mặc định"""
    print("[Docupedia] Initializing default data and admin user...")
    init_default_admin()