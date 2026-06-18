from flask import Flask, send_from_directory, request, redirect
from flask import Flask, render_template
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datetime import datetime
from config_doupedia import get_config_doupedia
from uhes_restful_blueprint_doupedia import docupedia_bp, init_docupedia_db

# Get configuration
config = get_config_doupedia()

# Create Flask app (bỏ static_folder mặc định vì sẽ tự quản lý nhiều thư mục)
app = Flask(__name__)
app.config['SECRET_KEY'] = config.JWT_SECRET_KEY

# Khai báo đường dẫn tuyệt đối tới thư mục build tĩnh của Frontend
# Vite đang xuất ra thư mục "dist" ở ngoài gốc dự án, 
# nên ta lùi lại 1 cấp (dirname(dirname)) để trỏ đúng vào "dist".
DOCUPEDIA_STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
 
# Khởi tạo dữ liệu và tài khoản Admin ngay lập tức để đảm bảo luôn tồn tại
init_docupedia_db()

# Register API routes
#app.register_blueprint(docupedia_bp, url_prefix=config.API_PREFIX)
app.register_blueprint(docupedia_bp, url_prefix='/api/v1/docupedia')

# --- MIDDLEWARE & ERROR HANDLERS ---

@app.before_request
def handle_options_request():
    """Xử lý tự động các Preflight Request (OPTIONS) cho CORS."""
    if request.method == 'OPTIONS':
        return "", 200

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    return response

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith(config.API_PREFIX):
        from utils.response import error_response
        return error_response('Endpoint không tồn tại', 'NOT_FOUND', 404)
    return "Not Found", 404

# --- FRONTEND PROXY ROUTES ---
@app.route('/home')
def home():
    # Lấy ngày giờ hiện tại của hệ thống
    now = datetime.now()
    
    # Định dạng ngày tháng năm (Ví dụ: 18/06/2026)
    current_date = now.strftime("%d/%m/%Y")
    
    # Định dạng giờ phút giây (Ví dụ: 16:37:56)
    current_time = now.strftime("%H:%M:%S")

    # Hàm render_template tự động tìm file trong thư mục 'templates'
    # Truyền các biến current_date và current_time sang file HTML
    return render_template('home.html', date=current_date, time=current_time)
 
@app.route("/")
def index_redirect_home():
    """Chuyển hướng gốc mặc định (bạn có thể chọn /docupedia hoặc /task)"""
    return redirect("/docupedia")

@app.route("/login")
def index_redirect_login():
    """Chuyển hướng gốc mặc định (bạn có thể chọn /docupedia hoặc /task)"""
    return redirect("/docupedia")


@app.route("/docupedia")
@app.route("/docupedia/<path:path>")
def serve_docupedia(path=""):
    """Phục vụ Frontend Docupedia"""
    file_path = os.path.join(DOCUPEDIA_STATIC_DIR, path)
    if path and os.path.exists(file_path):
        return send_from_directory(DOCUPEDIA_STATIC_DIR, path)
        
    index_path = os.path.join(DOCUPEDIA_STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] Docupedia index.html not found at {index_path}")
    return send_from_directory(DOCUPEDIA_STATIC_DIR, "index.html")

 
if __name__ == "__main__":
    print("[Flask] Initializing application...")
    
    print(f"[Flask] API available at {config.API_PREFIX}")
    print(f"[Flask] Default admin: {config.DEFAULT_ADMIN_USERNAME}/{config.DEFAULT_ADMIN_PASSWORD}")
    print("[Flask] Starting server...")
    
    app.run(host="0.0.0.0", debug=True)
