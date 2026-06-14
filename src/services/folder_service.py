import os
import sys
from typing import List, Dict, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp
from services.tree_service import TreeService

config = get_config_doupedia()


class FolderService:
    """Folder management service"""
    
    @staticmethod
    def _get_folders_dir(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'folders')
    
    @staticmethod
    def get_all_folders(project_id: str) -> List[Dict]:
        """Get all folders in a project"""
        folders_dir = FolderService._get_folders_dir(project_id)
        folders = []
        
        if os.path.exists(folders_dir):
            for filename in os.listdir(folders_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(folders_dir, filename)
                    folder = JSONStorage.read(filepath)
                    folders.append(folder)
        
        return folders
    
    @staticmethod
    def get_folder(project_id: str, folder_id: str) -> Optional[Dict]:
        """Get folder by ID"""
        folders_dir = FolderService._get_folders_dir(project_id)
        filepath = os.path.join(folders_dir, f'{folder_id}.json')
        
        if os.path.exists(filepath):
            return JSONStorage.read(filepath)
        return None
    
    @staticmethod
    def create_folder(project_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Create new folder"""
        folder_id = generate_id('folder')
        timestamp = get_timestamp()
        
        folder = {
            'id': folder_id,
            'type': 'folder',
            'title': data['title'],
            'parent_id': data.get('parent_id', 'root'),
            'children': [],
            'created_by': user_id,
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        # Save folder file
        folders_dir = FolderService._get_folders_dir(project_id)
        os.makedirs(folders_dir, exist_ok=True)
        filepath = os.path.join(folders_dir, f'{folder_id}.json')
        JSONStorage.write(filepath, folder)
        
        # Update tree
        TreeService.add_node(project_id, folder_id, folder['parent_id'], {
            'id': folder_id,
            'type': 'folder',
            'title': folder['title'],
            'children': []
        })
        
        return True, folder
    
    @staticmethod
    def update_folder(project_id: str, folder_id: str, data: Dict) -> Tuple[bool, any]:
        """Update folder"""
        folders_dir = FolderService._get_folders_dir(project_id)
        filepath = os.path.join(folders_dir, f'{folder_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy thư mục"
        
        folder = JSONStorage.read(filepath)
        
        # Update allowed fields
        if 'title' in data:
            folder['title'] = data['title']
        
        folder['updated_at'] = get_timestamp()
        
        JSONStorage.write(filepath, folder)
        
        # Update in tree nodes
        TreeService.update_node(project_id, folder_id, {'title': folder['title']})
        
        return True, folder
    
    @staticmethod
    def delete_folder(project_id: str, folder_id: str) -> Tuple[bool, str]:
        """Delete folder and all contents"""
        folders_dir = FolderService._get_folders_dir(project_id)
        filepath = os.path.join(folders_dir, f'{folder_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy thư mục"
        
        # Get folder to find parent and children
        folder = JSONStorage.read(filepath)
        parent_id = folder.get('parent_id', 'root')
        
        # Delete all children recursively
        FolderService._delete_children(project_id, folder_id)
        
        # Delete folder file
        os.remove(filepath)
        
        # Remove from tree
        TreeService.remove_node(project_id, folder_id, parent_id)
        
        return True, "Xóa thư mục thành công"
    
    @staticmethod
    def _delete_children(project_id: str, folder_id: str):
        """Recursively delete all children of a folder"""
        from services.document_service import DocumentService
        
        tree = TreeService.get_tree(project_id)
        if not tree:
            return
        
        node = tree.get('nodes', {}).get(folder_id)
        if not node or 'children' not in node:
            return
        
        for child_id in node.get('children', []):
            child_node = tree.get('nodes', {}).get(child_id)
            if child_node:
                if child_node.get('type') == 'folder':
                    # Recursively delete folder children
                    FolderService._delete_children(project_id, child_id)
                    # Delete folder file
                    folder_path = os.path.join(
                        FolderService._get_folders_dir(project_id), 
                        f'{child_id}.json'
                    )
                    if os.path.exists(folder_path):
                        os.remove(folder_path)
                else:
                    # Delete document file
                    doc_path = os.path.join(
                        DocumentService._get_docs_dir(project_id),
                        f'{child_id}.json'
                    )
                    if os.path.exists(doc_path):
                        os.remove(doc_path)
