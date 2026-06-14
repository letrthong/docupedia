"""
Docupedia Configuration & Path Utilities
Centralized configuration for the application.
"""

import os
from datetime import timedelta
from pathlib import Path


# =============================================================================
# PATH CONFIGURATION
# =============================================================================

# Root directory of the project (parent of src/)
ROOT_DIR = Path(__file__).parent.parent.resolve()

# Source directory
SRC_DIR = ROOT_DIR / 'src'

ROOT_DATABASE_DIR = Path('/app/config/docupedia')

# Data directory (can be overridden by environment variable)
DATA_DIR = Path(os.environ.get('DATA_DIR', ROOT_DIR / 'data'))

# Static files directory (React build output)
STATIC_DIR = ROOT_DIR / 'dist'

# JSON database files
USERS_FILE = ROOT_DATABASE_DIR / 'users.json'
PROJECTS_FILE = ROOT_DATABASE_DIR / 'projects.json'
PERMISSIONS_FILE = ROOT_DATABASE_DIR / 'permissions.json'

# Projects data directory 
PROJECTS_DATA_DIR = ROOT_DATABASE_DIR / 'projects'


# =============================================================================
# PATH HELPER FUNCTIONS
# =============================================================================

def ensure_dir(path: Path) -> Path:
    """Ensure a directory exists, create if it doesn't."""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def ensure_data_dirs() -> None:
    """Ensure all required data directories exist."""
    ensure_dir(DATA_DIR)
    ensure_dir(PROJECTS_DATA_DIR)


def get_project_dir(project_id: int) -> Path:
    """Get the directory path for a specific project."""
    return PROJECTS_DATA_DIR / str(project_id)


def get_project_tree_file(project_id: int) -> Path:
    """Get the tree.json file path for a specific project."""
    return get_project_dir(project_id) / 'tree.json'


def get_project_documents_dir(project_id: int) -> Path:
    """Get the documents directory for a specific project."""
    return get_project_dir(project_id) / 'documents'


def get_document_file(project_id: int, doc_id: str) -> Path:
    """Get the file path for a specific document."""
    return get_project_documents_dir(project_id) / f'{doc_id}.json'


def ensure_project_dirs(project_id: int) -> None:
    """Ensure all directories for a project exist."""
    ensure_dir(get_project_dir(project_id))
    ensure_dir(get_project_documents_dir(project_id))


# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

class ConfigDoupedia:
    """Application configuration"""
    
    # Base paths (string versions for backward compatibility)
    BASE_DIR = str(ROOT_DIR)
    DATA_DIR = str(DATA_DIR)
    
    # JSON file paths
    USERS_FILE = str(USERS_FILE)
    PROJECTS_FILE = str(PROJECTS_FILE)
    PERMISSIONS_FILE = str(PERMISSIONS_FILE)
    PROJECTS_DATA_DIR = str(PROJECTS_DATA_DIR)
    
    # JWT Settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'docupedia-secret-key-change-in-production-2026')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    JWT_EXPIRATION_DELTA = timedelta(hours=JWT_EXPIRATION_HOURS)
    
    # API Settings
    API_PREFIX = '/api/v1'
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Debug
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Default admin credentials
    DEFAULT_ADMIN_USERNAME = 'admin'
    DEFAULT_ADMIN_PASSWORD = 'admin'


class DevelopmentConfig(ConfigDoupedia):
    DEBUG = True


class ProductionConfig(ConfigDoupedia):
    DEBUG = False


def get_config_doupedia():
    """Get configuration based on environment."""
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig()
    return DevelopmentConfig()


# Initialize data directories on module import
ensure_data_dirs()