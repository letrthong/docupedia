import os
import sys
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, generate_id, get_timestamp
from services.tree_service import TreeService

config = get_config_doupedia()


class DocumentService:
    """Document management service"""
    @staticmethod
    def _get_locks_filepath() -> str:
        return os.path.join(config.ROOT_DATABASE_DIR, 'locks.json')

    @staticmethod
    def _read_locks() -> Dict[str, Dict]:
        filepath = DocumentService._get_locks_filepath()
        locks = JSONStorage.read(filepath)
        parsed_locks = {}
        for k, v in locks.items():
            try:
                parsed_locks[k] = {
                    'locked_by': v['locked_by'],
                    'locked_by_name': v['locked_by_name'],
                    'locked_at': datetime.fromisoformat(v['locked_at'].replace('Z', '')),
                    'expires_at': datetime.fromisoformat(v['expires_at'].replace('Z', ''))
                }
            except Exception:
                pass
        return parsed_locks

    @staticmethod
    def _write_locks(locks: Dict[str, Dict]) -> None:
        filepath = DocumentService._get_locks_filepath()
        serialized_locks = {}
        for k, v in locks.items():
            serialized_locks[k] = {
                'locked_by': v['locked_by'],
                'locked_by_name': v['locked_by_name'],
                'locked_at': v['locked_at'].isoformat() + 'Z' if isinstance(v['locked_at'], datetime) else v['locked_at'],
                'expires_at': v['expires_at'].isoformat() + 'Z' if isinstance(v['expires_at'], datetime) else v['expires_at']
            }
        JSONStorage.write(filepath, serialized_locks)

    @staticmethod
    def _cleanup_expired_locks() -> Dict[str, Dict]:
        """Remove all expired locks from file and return active locks"""
        locks = DocumentService._read_locks()
        current_time = datetime.utcnow()
        expired_keys = []
        
        # Load custom max session duration from settings.json or default to 30
        settings_file = os.path.join(config.ROOT_DATABASE_DIR, 'settings.json')
        settings = JSONStorage.read(settings_file)
        max_minutes = settings.get('max_session_duration_minutes', 30)
        max_session_duration = timedelta(minutes=max_minutes)

        for k, v in list(locks.items()):
            if v['expires_at'] <= current_time or current_time - v['locked_at'] >= max_session_duration:
                expired_keys.append(k)
                del locks[k]
        if expired_keys:
            DocumentService._write_locks(locks)
        return locks

    @staticmethod
    def _get_docs_dir(project_id: str) -> str:
        return os.path.join(config.PROJECTS_DATA_DIR, project_id, 'docs')
        
    @staticmethod
    def acquire_lock(project_id: str, doc_id: str, user_id: str) -> Tuple[bool, Dict]:
        """Acquire lock on a document. Returns (success, lock_info_or_error_details)"""
        locks = DocumentService._cleanup_expired_locks()

        key_str = f"{project_id}:{doc_id}"
        current_time = datetime.utcnow()
        lock_duration = timedelta(minutes=5)
        
        # Load custom max session duration from settings.json or default to 30
        settings_file = os.path.join(config.ROOT_DATABASE_DIR, 'settings.json')
        settings = JSONStorage.read(settings_file)
        max_minutes = settings.get('max_session_duration_minutes', 30)
        max_session_duration = timedelta(minutes=max_minutes)

        # Get user details for lock info
        user = JSONStorage.find_in_list(config.USERS_FILE, 'users', user_id)
        username = user.get('display_name') or user.get('username') if user else 'Unknown'

        # If already locked
        if key_str in locks:
            existing_lock = locks[key_str]
            
            # Check if this lock has exceeded the max session limit
            if current_time - existing_lock['locked_at'] >= max_session_duration:
                # Expire it now
                del locks[key_str]
                DocumentService._write_locks(locks)
                return False, {
                    'error_code': 'LOCK_SESSION_EXPIRED',
                    'message': f'Thời gian chỉnh sửa tối đa đã hết ({max_minutes} phút). Tài liệu đã được tự động mở khóa.'
                }

            # If locked by someone else
            if existing_lock['locked_by'] != user_id:
                return False, {
                    'error_code': 'DOCUMENT_LOCKED',
                    'locked_by': existing_lock['locked_by'],
                    'locked_by_name': existing_lock['locked_by_name'],
                    'locked_at': existing_lock['locked_at'].isoformat() + 'Z',
                    'expires_at': existing_lock['expires_at'].isoformat() + 'Z'
                }

            # If locked by same user, extend the duration
            existing_lock['expires_at'] = current_time + lock_duration
            lock_info = existing_lock
        else:
            # Create a brand new lock
            lock_info = {
                'locked_by': user_id,
                'locked_by_name': username,
                'locked_at': current_time,
                'expires_at': current_time + lock_duration
            }
            locks[key_str] = lock_info

        DocumentService._write_locks(locks)

        session_expires_at = lock_info['locked_at'] + max_session_duration
        expires_in = max(0, int((lock_info['expires_at'] - current_time).total_seconds()))
        session_expires_in = max(0, int((session_expires_at - current_time).total_seconds()))
        
        return True, {
            'locked_by': lock_info['locked_by'],
            'locked_by_name': lock_info['locked_by_name'],
            'locked_at': lock_info['locked_at'].isoformat() + 'Z',
            'expires_at': lock_info['expires_at'].isoformat() + 'Z',
            'session_expires_at': session_expires_at.isoformat() + 'Z',
            'expires_in': expires_in,
            'session_expires_in': session_expires_in
        }

    @staticmethod
    def release_lock(project_id: str, doc_id: str, user_id: str) -> bool:
        """Release lock on a document"""
        locks = DocumentService._read_locks()
        key_str = f"{project_id}:{doc_id}"
        if key_str in locks:
            # Releasing is allowed if it's the owner or admin
            if locks[key_str]['locked_by'] == user_id:
                del locks[key_str]
                DocumentService._write_locks(locks)
                return True
        return False

    @staticmethod
    def get_lock_info(project_id: str, doc_id: str) -> Optional[Dict]:
        """Get current active lock info on a document"""
        locks = DocumentService._cleanup_expired_locks()
        key_str = f"{project_id}:{doc_id}"
        if key_str in locks:
            lock_info = locks[key_str]
            
            # Load custom max session duration from settings.json or default to 30
            settings_file = os.path.join(config.ROOT_DATABASE_DIR, 'settings.json')
            settings = JSONStorage.read(settings_file)
            max_minutes = settings.get('max_session_duration_minutes', 30)
            max_session_duration = timedelta(minutes=max_minutes)
            session_expires_at = lock_info['locked_at'] + max_session_duration

            current_time = datetime.utcnow()
            expires_in = max(0, int((lock_info['expires_at'] - current_time).total_seconds()))
            session_expires_in = max(0, int((session_expires_at - current_time).total_seconds()))

            return {
                'locked_by': lock_info['locked_by'],
                'locked_by_name': lock_info['locked_by_name'],
                'locked_at': lock_info['locked_at'].isoformat() + 'Z',
                'expires_at': lock_info['expires_at'].isoformat() + 'Z',
                'session_expires_at': session_expires_at.isoformat() + 'Z',
                'expires_in': expires_in,
                'session_expires_in': session_expires_in
            }
        return None
    
    @staticmethod
    def get_all_documents(project_id: str) -> List[Dict]:
        """Get all documents in a project"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        documents = []
        
        if os.path.exists(docs_dir):
            for filename in os.listdir(docs_dir):
                if filename.endswith('.json') and not (filename.endswith('_comments.json') or filename.endswith('_history.json')):
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
        
        # Add history entry
        DocumentService.add_history_entry(project_id, doc_id, 'create', user_id, {
            'title': document['title']
        })
        
        return True, document
    
    @staticmethod
    def update_document(project_id: str, doc_id: str, data: Dict, user_id: str) -> Tuple[bool, any]:
        """Update document"""
        # Check lock
        lock_info = DocumentService.get_lock_info(project_id, doc_id)
        if lock_info and lock_info['locked_by'] != user_id:
            return False, f"Tài liệu đang bị khóa chỉnh sửa bởi {lock_info['locked_by_name']}"

        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy tài liệu"
        
        document = JSONStorage.read(filepath)
        
        # Compare changes
        changes = {}
        if 'title' in data and data['title'] != document['title']:
            changes['title'] = {
                'old': document['title'],
                'new': data['title']
            }
        if 'content' in data and data['content'] != document['content']:
            changes['content'] = 'Nội dung tài liệu được cập nhật'
            
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
        
        # Add history entry
        if changes:
            DocumentService.add_history_entry(project_id, doc_id, 'update', user_id, {
                'changes': changes
            })
        
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
        
        # Delete comments and history files if they exist
        comments_filepath = os.path.join(docs_dir, f'{doc_id}_comments.json')
        if os.path.exists(comments_filepath):
            try:
                os.remove(comments_filepath)
            except Exception:
                pass
                
        history_filepath = os.path.join(docs_dir, f'{doc_id}_history.json')
        if os.path.exists(history_filepath):
            try:
                os.remove(history_filepath)
            except Exception:
                pass
        
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

    @staticmethod
    def _encode_base64(text: str) -> str:
        import base64
        try:
            if not text:
                return ""
            return base64.b64encode(text.encode('utf-8')).decode('utf-8')
        except Exception:
            return text

    @staticmethod
    def _decode_base64(text: str) -> str:
        import base64
        import string
        try:
            if not text:
                return ""
            # Ensure text only contains base64 characters to avoid false positive decode
            is_b64_chars = all(c in (string.ascii_letters + string.digits + '+/= \n\r') for c in text)
            if not is_b64_chars:
                return text
            decoded_bytes = base64.b64decode(text.encode('utf-8'))
            return decoded_bytes.decode('utf-8')
        except Exception:
            return text

    @staticmethod
    def get_comments(project_id: str, doc_id: str) -> List[Dict]:
        """Get all comments for a document (nested top-level comments and replies)"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_comments.json')
        if not os.path.exists(filepath):
            return []
        
        data = JSONStorage.read(filepath)
        raw_comments = data.get('comments', [])
        
        # Enrich raw comments and decode base64
        enriched_comments = []
        try:
            from services.user_service import UserService
            user_cache = {}
            for comment in raw_comments:
                uid = comment.get('user_id')
                if uid not in user_cache:
                    user = UserService.get_user_by_id(uid)
                    if user:
                        user_cache[uid] = {
                            'display_name': user.get('display_name', user['username']),
                            'username': user['username']
                        }
                    else:
                        user_cache[uid] = {
                            'display_name': comment.get('display_name', comment.get('username', 'User')),
                            'username': comment.get('username', 'user')
                        }
                
                # Base64 decode content
                content_base64 = comment.get('content', '')
                decoded_content = DocumentService._decode_base64(content_base64)
                
                enriched_comments.append({
                    'id': comment['id'],
                    'parent_id': comment.get('parent_id'),
                    'user_id': uid,
                    'username': user_cache[uid]['username'],
                    'display_name': user_cache[uid]['display_name'],
                    'content': decoded_content,
                    'created_at': comment['created_at'],
                    'updated_at': comment['updated_at'],
                    'replies': []
                })
        except Exception:
            # Fallback if enrichment fails
            for comment in raw_comments:
                content_base64 = comment.get('content', '')
                decoded_content = DocumentService._decode_base64(content_base64)
                enriched_comments.append({
                    'id': comment['id'],
                    'parent_id': comment.get('parent_id'),
                    'user_id': comment.get('user_id'),
                    'username': comment.get('username', 'user'),
                    'display_name': comment.get('display_name', 'User'),
                    'content': decoded_content,
                    'created_at': comment['created_at'],
                    'updated_at': comment['updated_at'],
                    'replies': []
                })
        
        # Build recursive tree
        comment_dict = {c['id']: c for c in enriched_comments}
        roots = []
        
        for c in enriched_comments:
            p_id = c.get('parent_id')
            if not p_id or p_id not in comment_dict:
                roots.append(c)
            else:
                comment_dict[p_id]['replies'].append(c)
                
        # Sort replies of each node by created_at ascending
        def sort_replies(node):
            node['replies'].sort(key=lambda x: x['created_at'])
            for r in node['replies']:
                sort_replies(r)
                
        for r in roots:
            sort_replies(r)
            
        return roots

    @staticmethod
    def add_comment(project_id: str, doc_id: str, content: str, user_id: str, parent_id: str = None) -> Tuple[bool, any]:
        """Add a comment (or reply) to a document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_comments.json')
        
        # Get user details
        from services.user_service import UserService
        user = UserService.get_user_by_id(user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
            
        timestamp = get_timestamp()
        
        # Base64 encode the content before saving
        content_b64 = DocumentService._encode_base64(content)
        
        comment = {
            'id': generate_id('comment'),
            'parent_id': parent_id,
            'user_id': user_id,
            'username': user['username'],
            'display_name': user.get('display_name', user['username']),
            'content': content_b64,
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        # Read existing or create new comments structure
        data = JSONStorage.read(filepath)
        if 'doc_id' not in data:
            data['doc_id'] = doc_id
        if 'comments' not in data:
            data['comments'] = []
            
        data['comments'].append(comment)
        JSONStorage.write(filepath, data)
        
        # Return response with decoded content
        comment_response = comment.copy()
        comment_response['content'] = content
        return True, comment_response

    @staticmethod
    def update_comment(project_id: str, doc_id: str, comment_id: str, content: str, user_id: str, is_admin_or_manage: bool) -> Tuple[bool, any]:
        """Update an existing comment"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_comments.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy bình luận"
            
        data = JSONStorage.read(filepath)
        comments = data.get('comments', [])
        
        # Check if the comment has replies
        has_replies = any(c.get('parent_id') == comment_id for c in comments)
        if has_replies:
            return False, "Không thể chỉnh sửa bình luận đã có phản hồi"
            
        updated_comment = None
        for c in comments:
            if c['id'] == comment_id:
                # Check authorization: owner, or admin/manage
                if c['user_id'] != user_id and not is_admin_or_manage:
                    return False, "Bạn không có quyền chỉnh sửa bình luận này"
                
                # Base64 encode the content
                c['content'] = DocumentService._encode_base64(content)
                c['updated_at'] = get_timestamp()
                updated_comment = c.copy()
                updated_comment['content'] = content
                break
                
        if not updated_comment:
            return False, "Không tìm thấy bình luận"
            
        JSONStorage.write(filepath, data)
        return True, updated_comment

    @staticmethod
    def delete_comment(project_id: str, doc_id: str, comment_id: str, user_id: str, is_admin_or_manage: bool) -> Tuple[bool, str]:
        """Delete a comment and any nested replies"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_comments.json')
        
        if not os.path.exists(filepath):
            return False, "Không tìm thấy bình luận"
            
        data = JSONStorage.read(filepath)
        comments = data.get('comments', [])
        
        # Check if the comment has replies
        has_replies = any(c.get('parent_id') == comment_id for c in comments)
        if has_replies:
            return False, "Không thể xóa bình luận đã có phản hồi"
            
        target_comment = None
        for c in comments:
            if c['id'] == comment_id:
                target_comment = c
                break
                
        if not target_comment:
            return False, "Không tìm thấy bình luận"
            
        # Check authorization: owner, or admin/manage
        if target_comment['user_id'] != user_id and not is_admin_or_manage:
            return False, "Bạn không có quyền xóa bình luận này"
            
        # If it's a top-level comment (no parent_id), delete it and all its replies.
        # If it's a reply (has parent_id), delete only itself.
        ids_to_delete = {comment_id}
        if not target_comment.get('parent_id'):
            # It's top level, find replies
            for c in comments:
                if c.get('parent_id') == comment_id:
                    ids_to_delete.add(c['id'])
                    
        data['comments'] = [c for c in comments if c['id'] not in ids_to_delete]
        JSONStorage.write(filepath, data)
        return True, "Xóa bình luận thành công"

    @staticmethod
    def get_history(project_id: str, doc_id: str) -> List[Dict]:
        """Get edit history for a document"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_history.json')
        if not os.path.exists(filepath):
            return []
            
        data = JSONStorage.read(filepath)
        history = data.get('history', [])
        
        # Enrich history entries with latest names if possible
        try:
            from services.user_service import UserService
            for entry in history:
                if entry.get('user_id'):
                    user = UserService.get_user_by_id(entry['user_id'])
                    if user:
                        entry['display_name'] = user.get('display_name', user['username'])
                        entry['username'] = user['username']
        except Exception:
            pass
            
        return history

    @staticmethod
    def add_history_entry(project_id: str, doc_id: str, action: str, user_id: str, details: Dict = None) -> None:
        """Helper to append an edit history entry"""
        docs_dir = DocumentService._get_docs_dir(project_id)
        filepath = os.path.join(docs_dir, f'{doc_id}_history.json')
        
        # Get user details
        username = 'system'
        display_name = 'System'
        try:
            from services.user_service import UserService
            user = UserService.get_user_by_id(user_id)
            if user:
                username = user['username']
                display_name = user.get('display_name', user['username'])
        except Exception:
            pass
            
        entry = {
            'id': generate_id('hist'),
            'user_id': user_id,
            'username': username,
            'display_name': display_name,
            'action': action,
            'timestamp': get_timestamp(),
            'details': details or {}
        }
        
        data = JSONStorage.read(filepath)
        if 'doc_id' not in data:
            data['doc_id'] = doc_id
        if 'history' not in data:
            data['history'] = []
            
        data['history'].append(entry)
        JSONStorage.write(filepath, data)
