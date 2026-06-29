from flask import Blueprint

# Create blueprints
auth_bp = Blueprint('auth', __name__)
users_bp = Blueprint('users', __name__)
projects_bp = Blueprint('projects', __name__)
permissions_bp = Blueprint('permissions', __name__)
documents_bp = Blueprint('documents', __name__)
folders_bp = Blueprint('folders', __name__)
tree_bp = Blueprint('tree', __name__)
settings_bp = Blueprint('settings', __name__)


def register_routes(app, api_prefix='/api/v1'):
    """Register all blueprints with the Flask app"""
    # Import route handlers to register endpoints
    from routes import auth, users, projects, permissions, documents, folders, tree, settings
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix=f'{api_prefix}/auth')
    app.register_blueprint(users_bp, url_prefix=f'{api_prefix}/users')
    app.register_blueprint(projects_bp, url_prefix=f'{api_prefix}/projects')
    app.register_blueprint(settings_bp, url_prefix=f'{api_prefix}/settings')
    
    print(f"[Routes] Registered API endpoints at {api_prefix}")
