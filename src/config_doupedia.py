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

# Base paths
ROOT_DATABASE_DIR = Path(os.environ.get('ROOT_DATABASE_DIR', '/app/config/docupedia'))

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
    root_db = Path(os.environ.get('ROOT_DATABASE_DIR', '/app/config/docupedia'))
    ensure_dir(root_db)
    ensure_dir(root_db / 'projects')


def get_project_dir(project_id: int) -> Path:
    """Get the directory path for a specific project."""
    root_db = Path(os.environ.get('ROOT_DATABASE_DIR', '/app/config/docupedia'))
    return root_db / 'projects' / str(project_id)


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
    
    @property
    def ROOT_DATABASE_DIR(self) -> str:
        return os.environ.get('ROOT_DATABASE_DIR', '/app/config/docupedia')
    
    @property
    def USERS_FILE(self) -> str:
        return os.path.join(self.ROOT_DATABASE_DIR, 'users.json')
    
    @property
    def PROJECTS_FILE(self) -> str:
        return os.path.join(self.ROOT_DATABASE_DIR, 'projects.json')
    
    @property
    def PERMISSIONS_FILE(self) -> str:
        return os.path.join(self.ROOT_DATABASE_DIR, 'permissions.json')
    
    @property
    def PROJECTS_DATA_DIR(self) -> str:
        return os.path.join(self.ROOT_DATABASE_DIR, 'projects')
    
    # JWT Settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'docupedia-secret-key-change-in-production-2026')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    JWT_EXPIRATION_DELTA = timedelta(hours=JWT_EXPIRATION_HOURS)
    
    # API Settings
    API_PREFIX = '/api/v1'
    
    # History settings
    MAX_HISTORY_ENTRIES = int(os.environ.get('MAX_HISTORY_ENTRIES', 50))
    
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


_config_instance = None


def get_config_doupedia():
    """Get configuration singleton based on environment."""
    global _config_instance
    if _config_instance is not None:
        return _config_instance
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        _config_instance = ProductionConfig()
    else:
        _config_instance = DevelopmentConfig()
    return _config_instance


# Initialize data directories on module import
ensure_data_dirs()