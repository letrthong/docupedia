import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from contextlib import contextmanager
import threading

# File lock for thread safety
_file_locks = {}
_lock_manager = threading.Lock()


def _get_file_lock(filepath: str) -> threading.Lock:
    """Get or create a lock for a specific file"""
    with _lock_manager:
        if filepath not in _file_locks:
            _file_locks[filepath] = threading.Lock()
        return _file_locks[filepath]


class JSONStorage:
    """Thread-safe JSON file storage"""
    
    @staticmethod
    @contextmanager
    def file_lock(filepath: str):
        """Context manager for file locking"""
        lock = _get_file_lock(filepath)
        lock.acquire()
        try:
            yield
        finally:
            lock.release()
    
    @classmethod
    def read(cls, filepath: str) -> Dict:
        """Read JSON file with lock"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with cls.file_lock(filepath):
            if not os.path.exists(filepath):
                return {}
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return {}
    
    @classmethod
    def write(cls, filepath: str, data: Dict) -> None:
        """Write JSON file with lock"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with cls.file_lock(filepath):
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
    
    @classmethod
    def update(cls, filepath: str, key: str, value: Any) -> None:
        """Update specific key in JSON file"""
        data = cls.read(filepath)
        data[key] = value
        cls.write(filepath, data)
    
    @classmethod
    def append_to_list(cls, filepath: str, list_key: str, item: Dict) -> None:
        """Append item to a list in JSON file"""
        data = cls.read(filepath)
        if list_key not in data:
            data[list_key] = []
        data[list_key].append(item)
        cls.write(filepath, data)
    
    @classmethod
    def update_in_list(cls, filepath: str, list_key: str, 
                       item_id: str, updates: Dict, id_field: str = 'id') -> bool:
        """Update item in a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return False
        
        for i, item in enumerate(data[list_key]):
            if item.get(id_field) == item_id:
                data[list_key][i].update(updates)
                data[list_key][i]['updated_at'] = get_timestamp()
                cls.write(filepath, data)
                return True
        return False
    
    @classmethod
    def delete_from_list(cls, filepath: str, list_key: str, 
                         item_id: str, id_field: str = 'id') -> bool:
        """Delete item from a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return False
        
        original_length = len(data[list_key])
        data[list_key] = [item for item in data[list_key] 
                          if item.get(id_field) != item_id]
        
        if len(data[list_key]) < original_length:
            cls.write(filepath, data)
            return True
        return False
    
    @classmethod
    def find_in_list(cls, filepath: str, list_key: str, 
                     item_id: str, id_field: str = 'id') -> Optional[Dict]:
        """Find item in a list by ID"""
        data = cls.read(filepath)
        if list_key not in data:
            return None
        
        for item in data[list_key]:
            if item.get(id_field) == item_id:
                return item
        return None
    
    @classmethod
    def find_by_field(cls, filepath: str, list_key: str, 
                      field: str, value: Any) -> Optional[Dict]:
        """Find item in a list by any field"""
        data = cls.read(filepath)
        if list_key not in data:
            return None
        
        for item in data[list_key]:
            if item.get(field) == value:
                return item
        return None
    
    @classmethod
    def get_list(cls, filepath: str, list_key: str) -> List[Dict]:
        """Get all items in a list"""
        data = cls.read(filepath)
        return data.get(list_key, [])


def generate_id(prefix: str = '') -> str:
    """Generate unique ID with timestamp"""
    timestamp = int(time.time() * 1000)
    return f"{prefix}_{timestamp}" if prefix else str(timestamp)


def get_timestamp() -> str:
    """Get current UTC timestamp in ISO format"""
    return datetime.utcnow().isoformat() + 'Z'
