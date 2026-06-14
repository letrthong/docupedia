import os
import sys
from typing import Dict, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, get_timestamp

config = get_config_doupedia()


class TreeService:
    """Tree structure management service"""
    
    @staticmethod
    def _get_tree_file(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'tree.json')
    
    @staticmethod
    def get_tree(project_id: str) -> Optional[Dict]:
        """Get tree structure for a project"""
        tree_file = TreeService._get_tree_file(project_id)
        if os.path.exists(tree_file):
            return JSONStorage.read(tree_file)
        return None
    
    @staticmethod
    def save_tree(project_id: str, tree: Dict) -> bool:
        """Save tree structure"""
        tree_file = TreeService._get_tree_file(project_id)
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
        return True
    
    @staticmethod
    def add_node(project_id: str, node_id: str, parent_id: str, node_data: Dict):
        """Add node to tree"""
        tree_file = TreeService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Add to parent's children
        if parent_id == 'root':
            if 'children' not in tree['root']:
                tree['root']['children'] = []
            tree['root']['children'].append(node_id)
        else:
            if parent_id not in tree.get('nodes', {}):
                tree['nodes'][parent_id] = {'children': []}
            if 'children' not in tree['nodes'][parent_id]:
                tree['nodes'][parent_id]['children'] = []
            tree['nodes'][parent_id]['children'].append(node_id)
        
        # Add node to nodes
        if 'nodes' not in tree:
            tree['nodes'] = {}
        tree['nodes'][node_id] = node_data
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def remove_node(project_id: str, node_id: str, parent_id: str):
        """Remove node from tree"""
        tree_file = TreeService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Remove from parent's children
        if parent_id == 'root':
            tree['root']['children'] = [c for c in tree['root'].get('children', []) if c != node_id]
        elif parent_id in tree.get('nodes', {}):
            tree['nodes'][parent_id]['children'] = [
                c for c in tree['nodes'][parent_id].get('children', []) if c != node_id
            ]
        
        # Remove from nodes
        if node_id in tree.get('nodes', {}):
            del tree['nodes'][node_id]
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def update_node(project_id: str, node_id: str, updates: Dict):
        """Update node in tree"""
        tree_file = TreeService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        if node_id in tree.get('nodes', {}):
            tree['nodes'][node_id].update(updates)
            tree['updated_at'] = get_timestamp()
            JSONStorage.write(tree_file, tree)
    
    @staticmethod
    def move_node(project_id: str, node_id: str, old_parent: str, new_parent: str):
        """Move node in tree"""
        tree_file = TreeService._get_tree_file(project_id)
        tree = JSONStorage.read(tree_file)
        
        # Remove from old parent
        if old_parent == 'root':
            tree['root']['children'] = [c for c in tree['root'].get('children', []) if c != node_id]
        elif old_parent in tree.get('nodes', {}):
            tree['nodes'][old_parent]['children'] = [
                c for c in tree['nodes'][old_parent].get('children', []) if c != node_id
            ]
        
        # Add to new parent
        if new_parent == 'root':
            if 'children' not in tree['root']:
                tree['root']['children'] = []
            tree['root']['children'].append(node_id)
        else:
            if new_parent not in tree.get('nodes', {}):
                tree['nodes'][new_parent] = {'children': []}
            if 'children' not in tree['nodes'][new_parent]:
                tree['nodes'][new_parent]['children'] = []
            tree['nodes'][new_parent]['children'].append(node_id)
        
        tree['updated_at'] = get_timestamp()
        JSONStorage.write(tree_file, tree)
