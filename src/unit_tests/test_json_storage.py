"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho JSONStorage & File Striped Locks
Kiểm tra khả năng lưu trữ tệp JSON thread-safe, cập nhật danh sách và các hàm phụ trợ.
"""

import os
import sys
import unittest
import json
import tempfile
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from utils.json_storage import (
    JSONStorage,
    generate_id,
    get_timestamp,
    _get_file_lock,
    _NUM_LOCK_STRIPES
)


class TestJSONStorage(unittest.TestCase):
    """Kiểm tra toàn diện module JSONStorage"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_storage_")
        self.test_file = os.path.join(self.test_dir, "test_data.json")

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_read_non_existent_file(self):
        """1. Đọc tệp không tồn tại trả về dict rỗng {} an toàn."""
        res = JSONStorage.read(os.path.join(self.test_dir, "non_existent.json"))
        self.assertEqual(res, {})

    def test_02_read_invalid_json_file(self):
        """2. Đọc tệp JSON bị hỏng (corrupted) trả về {} không gây crash."""
        with open(self.test_file, 'w', encoding='utf-8') as f:
            f.write("{invalid_json: true, broken")

        res = JSONStorage.read(self.test_file)
        self.assertEqual(res, {})

    def test_03_write_and_read_data(self):
        """3. Ghi dữ liệu vào JSON và đọc lại chính xác."""
        sample_data = {
            "title": "Tài liệu kiểm thử",
            "count": 42,
            "items": ["a", "b", "c"],
            "active": True
        }
        JSONStorage.write(self.test_file, sample_data)
        self.assertTrue(os.path.exists(self.test_file))

        loaded = JSONStorage.read(self.test_file)
        self.assertEqual(loaded, sample_data)

    def test_04_update_key(self):
        """4. Cập nhật một key cụ thể trong tệp JSON."""
        JSONStorage.write(self.test_file, {"name": "Docupedia", "version": "1.0"})
        JSONStorage.update(self.test_file, "version", "2.0")

        loaded = JSONStorage.read(self.test_file)
        self.assertEqual(loaded["version"], "2.0")
        self.assertEqual(loaded["name"], "Docupedia")

    def test_05_list_operations(self):
        """5. Kiểm tra đầy đủ các thao tác danh sách: append, find, update, delete, get."""
        # Append to list
        item1 = {"id": "doc_1", "title": "Bản nháp 1", "author": "admin"}
        item2 = {"id": "doc_2", "title": "Bản nháp 2", "author": "user1"}
        JSONStorage.append_to_list(self.test_file, "documents", item1)
        JSONStorage.append_to_list(self.test_file, "documents", item2)

        # Get list
        docs = JSONStorage.get_list(self.test_file, "documents")
        self.assertEqual(len(docs), 2)

        # Find in list by ID
        found = JSONStorage.find_in_list(self.test_file, "documents", "doc_1")
        self.assertIsNotNone(found)
        self.assertEqual(found["title"], "Bản nháp 1")

        # Find by field
        found_author = JSONStorage.find_by_field(self.test_file, "documents", "author", "user1")
        self.assertIsNotNone(found_author)
        self.assertEqual(found_author["id"], "doc_2")

        # Update in list
        updated = JSONStorage.update_in_list(
            self.test_file, "documents", "doc_1", {"title": "Bản nháp 1 (Đã sửa)"}
        )
        self.assertTrue(updated)
        found_after = JSONStorage.find_in_list(self.test_file, "documents", "doc_1")
        self.assertEqual(found_after["title"], "Bản nháp 1 (Đã sửa)")
        self.assertIn("updated_at", found_after)

        # Delete from list
        deleted = JSONStorage.delete_from_list(self.test_file, "documents", "doc_1")
        self.assertTrue(deleted)
        docs_after = JSONStorage.get_list(self.test_file, "documents")
        self.assertEqual(len(docs_after), 1)
        self.assertEqual(docs_after[0]["id"], "doc_2")

    def test_06_striped_lock_pool_and_thread_safety(self):
        """6. Kiểm tra Striped Lock Pool không bị deadlock và an toàn đa luồng."""
        lock1 = _get_file_lock("path/to/file1.json")
        lock2 = _get_file_lock("path/to/file2.json")
        self.assertIsNotNone(lock1)
        self.assertIsNotNone(lock2)
        self.assertEqual(_NUM_LOCK_STRIPES, 64)

        # Kiểm tra ghi đồng thời từ nhiều luồng
        JSONStorage.write(self.test_file, {"counter": 0, "logs": []})

        def append_worker(worker_id):
            for i in range(20):
                JSONStorage.append_to_list(
                    self.test_file,
                    "logs",
                    {"worker": worker_id, "step": i, "id": f"w_{worker_id}_{i}"}
                )

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(append_worker, wid) for wid in range(5)]
            for f in futures:
                f.result()

        logs = JSONStorage.get_list(self.test_file, "logs")
        self.assertEqual(len(logs), 100)

    def test_07_helpers_generate_id_and_timestamp(self):
        """7. Kiểm tra hàm sinh id và lấy timestamp định dạng ISO UTC."""
        doc_id = generate_id("doc")
        self.assertTrue(doc_id.startswith("doc_"))

        custom_id = generate_id()
        self.assertTrue(custom_id.isdigit())

        ts = get_timestamp()
        self.assertTrue(ts.endswith("Z"))
        self.assertIn("T", ts)


if __name__ == "__main__":
    unittest.main()
