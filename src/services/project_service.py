import os
import sys
import shutil
from typing import List, Dict, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp

config = get_config_doupedia()


class ProjectService:
    """Project management service"""
    
    @staticmethod
    def get_all_projects() -> List[Dict]:
        """Get all projects"""
        return JSONStorage.get_list(config.PROJECTS_FILE, 'projects')
    
    @staticmethod
    def get_user_projects(user_id: str, user_role: str) -> List[Dict]:
        """Get projects accessible by user"""
        projects = JSONStorage.get_list(config.PROJECTS_FILE, 'projects')
        
        # Admin sees all projects
        if user_role == 'admin':
            for p in projects:
                p['user_permissions'] = ['view', 'create', 'edit', 'delete', 'manage']
            return projects
        
        # Regular user sees owned projects + permitted projects
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        user_permissions = {p['project_id']: p['permissions'] for p in permissions 
                          if p['user_id'] == user_id}
        
        accessible = []
        for project in projects:
            project_copy = project.copy()
            # Owner has all permissions
            if project.get('owner_id') == user_id:
                project_copy['user_permissions'] = ['view', 'create', 'edit', 'delete', 'manage']
                accessible.append(project_copy)
            # Has explicit permission
            elif project['id'] in user_permissions:
                project_copy['user_permissions'] = user_permissions[project['id']]
                accessible.append(project_copy)
        
        return accessible
    
    @staticmethod
    def get_project_by_id(project_id: str) -> Optional[Dict]:
        """Get project by ID"""
        return JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
    
    @staticmethod
    def create_project(data: Dict, owner_id: str) -> Tuple[bool, any]:
        """Create new project"""
        project_id = generate_id('proj')
        
        project = {
            'id': project_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'owner_id': owner_id,
            'is_active': True,
            'is_public': bool(data.get('is_public', False)),
            'allow_public_comments': bool(data.get('allow_public_comments', False)),
            'created_at': get_timestamp(),
            'updated_at': get_timestamp()
        }
        
        # Create project directory structure
        project_dir = os.path.join(config.PROJECTS_DATA_DIR, project_id)
        os.makedirs(os.path.join(project_dir, 'docs'), exist_ok=True)
        os.makedirs(os.path.join(project_dir, 'folders'), exist_ok=True)
        
        # Create initial tree.json
        tree = {
            'project_id': project_id,
            'root': {
                'id': 'root',
                'type': 'folder',
                'title': 'Thư mục gốc',
                'children': []
            },
            'nodes': {},
            'updated_at': get_timestamp()
        }
        tree_file = os.path.join(project_dir, 'tree.json')
        JSONStorage.write(tree_file, tree)
        
        # Save project to projects.json
        JSONStorage.append_to_list(config.PROJECTS_FILE, 'projects', project)
        
        return True, project
    
    @staticmethod
    def update_project(project_id: str, data: Dict) -> Tuple[bool, any]:
        """Update project"""
        project = JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        if not project:
            return False, "Không tìm thấy project"
        
        updates = {}
        allowed_fields = ['name', 'description', 'is_active', 'is_public', 'allow_public_comments']
        for field in allowed_fields:
            if field in data:
                if field in ['is_public', 'allow_public_comments']:
                    updates[field] = bool(data[field])
                else:
                    updates[field] = data[field]
        
        success = JSONStorage.update_in_list(
            config.PROJECTS_FILE, 'projects', project_id, updates
        )
        
        if success:
            return True, JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        return False, "Có lỗi xảy ra"
    
    @staticmethod
    def delete_project(project_id: str) -> Tuple[bool, str]:
        """Delete project and all its data"""
        project = JSONStorage.find_in_list(config.PROJECTS_FILE, 'projects', project_id)
        if not project:
            return False, "Không tìm thấy project"
        
        # Delete project directory
        project_dir = os.path.join(config.PROJECTS_DATA_DIR, project_id)
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        
        # Delete project from list
        success = JSONStorage.delete_from_list(config.PROJECTS_FILE, 'projects', project_id)
        
        # Delete related permissions
        permissions = JSONStorage.get_list(config.PERMISSIONS_FILE, 'permissions')
        permissions = [p for p in permissions if p['project_id'] != project_id]
        JSONStorage.update(config.PERMISSIONS_FILE, 'permissions', permissions)
        
        if success:
            return True, "Xóa project thành công"
        return False, "Có lỗi xảy ra"
