import os
import sys
from typing import List, Dict, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp
from services.tree_service import TreeService

config = get_config_doupedia()


class DocumentService:
    """Document management service"""
    
    @staticmethod
    def _get_docs_dir(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'docs')
    
    @staticmethod
    def get_all_documents(project_id: str) -> List[Dict]:
        """Get all documents in a project"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        documents = []
        
        if os.path.exists(docs_dir):
            for filename in os.listdir(docs_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(docs_dir, filename)
                    doc = JSONStorage.read(filepath)
                    # Don't include content in list view
                    doc_summary = {k: v for k, v in doc.items() if k != 'content'}
                    documents.append(doc_summary)
        
        return documents
    
    @staticmethod
    def get_document(project_id: str, doc_id: str) -> Optional[Dict]:
        """Get document by ID (including content)"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if os.path.exists(filepath):
            return JSONStorage.read(filepath)
        return None
    
    @staticmethod
    def create_document(project_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Create new document"""
        doc_id = generate_id('doc')
        timestamp = get_timestamp()
        
        document = {
            'id': doc_id,
            'type': 'file',
            'title': data['title'],
            'parent_id': data.get('parent_id', 'root'),
            'content': data.get('content', {'ops': []}),
            'created_by': user_id,
            'updated_by': user_id,
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        # Save document file
        docs_dir = DocumentService._get_docs_dir(project_id)
        os.makedirs(docs_dir, exist_ok=True)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        JSONStorage.write(filepath, document)
        
        # Update tree
        TreeService.add_node(project_id, doc_id, document['parent_id'], {
            'id': doc_id,
            'type': 'file',
            'title': document['title']
        })
        
        return True, document
    
    @staticmethod
    def update_document(project_id: str, doc_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Update document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        document = JSONStorage.read(filepath)
        
        # Update allowed fields
        if 'title' in data:
            document['title'] = data['title']
        if 'content' in data:
            document['content'] = data['content']
        
        document['updated_by'] = user_id
        document['updated_at'] = get_timestamp()
        
        JSONStorage.write(filepath, document)
        
        # Update in tree nodes
        TreeService.update_node(project_id, doc_id, {'title': document['title']})
        
        return True, document
    
    @staticmethod
    def delete_document(project_id: str, doc_id: str) -> Tuple[bool, str]:
        """Delete document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        # Get parent before deleting
        document = JSONStorage.read(filepath)
        parent_id = document.get('parent_id', 'root')
        
        # Delete file
        os.remove(filepath)
        
        # Remove from tree
        TreeService.remove_node(project_id, doc_id, parent_id)
        
        return True, "Xóa tài liệu thành công"
    
    @staticmethod
    def move_document(project_id: str, doc_id: str, new_parent_id: str) -> Tuple[bool, any]:
        """Move document to new parent"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        document = JSONStorage.read(filepath)
        old_parent_id = document.get('parent_id', 'root')
        
        # Update document
        document['parent_id'] = new_parent_id
        document['updated_at'] = get_timestamp()
        JSONStorage.write(filepath, document)
        
        # Update tree
        TreeService.move_node(project_id, doc_id, old_parent_id, new_parent_id)
        
        return True, document
    
    @staticmethod
    def export_document(project_id: str, doc_id: str, format_type: str) -> Tuple[bool, any]:
        """Export document to HTML or TXT"""
        document = DocumentService.get_document(project_id, doc_id)
        if not document:
            return False, "Không tìm thấy tài liệu"
        
        content = document.get('content', {})
        title = document.get('title', 'Untitled')
        
        if format_type == 'txt':
            text = DocumentService._delta_to_text(content)
            return True, {
                'filename': f'{title}.txt',
                'content': text,
                'mime_type': 'text/plain'
            }
        else:  # html
            html = DocumentService._delta_to_html(content, title)
            return True, {
                'filename': f'{title}.html',
                'content': html,
                'mime_type': 'text/html'
            }
    
    @staticmethod
    def _delta_to_text(delta: Dict) -> str:
        """Convert Quill delta to plain text"""
        ops = delta.get('ops', [])
        text_parts = []
        for op in ops:
            if isinstance(op.get('insert'), str):
                text_parts.append(op['insert'])
        return ''.join(text_parts)
    
    @staticmethod
    def _delta_to_html(delta: Dict, title: str) -> str:
        """Convert Quill delta to HTML"""
        text = DocumentService._delta_to_text(delta)
        return f'''<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 40px auto; 
            padding: 0 20px;
            line-height: 1.6;
            color: #333;
        }}
        h1 {{ color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <div>{text.replace(chr(10), '<br>')}</div>
</body>
</html>'''
