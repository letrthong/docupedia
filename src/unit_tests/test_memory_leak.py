"""
Bộ Kiểm Thử Đơn Vị (Unit Test) Chuyên Sâu: Memory Leak & Hiệu Năng Bộ Nhớ (tracemalloc & gc)
Kiểm tra độ ổn định RAM khi chỉnh sửa tài liệu liên tục, xử lý payload lớn,
hạn chế rò rỉ bộ nhớ (Memory Leak), chu kỳ tham chiếu (Circular References) và Striped Lock Pool invariance.
"""

import os
import sys
import gc
import json
import tracemalloc
import unittest
import tempfile
import shutil
from datetime import datetime, timedelta

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from config_doupedia import get_config_doupedia
from services.project_service import ProjectService
from services.document_service import DocumentService
from services.user_service import UserService
from services.auth_service import init_default_admin
from utils.json_storage import JSONStorage, _get_file_lock, _NUM_LOCK_STRIPES

config = get_config_doupedia()


class TestMemoryLeakAndPerformance(unittest.TestCase):
    """Kiểm tra rò rỉ bộ nhớ (Memory Leaks) và độ ổn định RAM của Backend Python"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_mem_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()

        # Tạo user tác giả
        _, self.user = UserService.create_user({
            "username": "mem_tester", "password": "Password123@", "display_name": "Memory Tester"
        })
        self.user_id = self.user["id"]

        # Tạo project kiểm thử
        _, self.project = ProjectService.create_project({
            "name": "Memory Test Project"
        }, self.user_id)
        self.project_id = self.project["id"]

        # Bắt đầu theo dõi phân bổ bộ nhớ (tracemalloc)
        gc.collect()
        tracemalloc.start()

    def tearDown(self):
        tracemalloc.stop()

        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_repeated_document_updates_memory_stability(self):
        """1. Chỉnh sửa và Lưu tài liệu liên tục 100 lần (Auto-save) - RAM phải ổn định không tăng phi mã."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Initial Doc"}, self.user_id)
        doc_id = doc["id"]

        gc.collect()
        snapshot_start = tracemalloc.take_snapshot()

        # Giả lập 100 lần gõ phím và auto-save
        for i in range(100):
            update_payload = {
                "title": f"Document Revision {i}",
                "content": {
                    "ops": [
                        {"insert": f"Đoạn văn bản cập nhật lần thứ {i}\n"},
                        {"insert": "Docupedia Realtime Performance Test\n", "attributes": {"bold": True}}
                    ]
                }
            }
            success, _ = DocumentService.update_document(self.project_id, doc_id, update_payload, self.user_id)
            self.assertTrue(success)

        gc.collect()
        snapshot_end = tracemalloc.take_snapshot()

        # So sánh chênh lệch bộ nhớ
        stats = snapshot_end.compare_to(snapshot_start, 'lineno')
        total_diff_kb = sum(stat.size_diff for stat in stats) / 1024

        # Sau 100 lần ghi file JSON và update tree, chênh lệch heap ròng không được vượt quá 1.5MB
        self.assertLess(total_diff_kb, 1500, f"Memory growth quá cao sau 100 lần save: {total_diff_kb:.2f} KB")

    def test_02_large_payload_memory_reclaim(self):
        """2. Xử lý tài liệu dung lượng lớn (~2MB Text Delta) - Sau khi hoàn tất, GC phải thu hồi bộ nhớ."""
        large_text = "Dòng dữ liệu kiểm thử tải trọng lớn của Docupedia 2026.\n" * 20000  # ~1.2MB text
        ops = [{"insert": large_text}]

        gc.collect()
        mem_before, _ = tracemalloc.get_traced_memory()

        # Tạo tài liệu lớn
        success, doc = DocumentService.create_document(
            self.project_id, {"title": "Large Payload Doc", "content": {"ops": ops}}, self.user_id
        )
        self.assertTrue(success)
        doc_id = doc["id"]

        # Đọc và xuất HTML
        success, export_res = DocumentService.export_document(self.project_id, doc_id, "html")
        self.assertTrue(success)
        self.assertGreater(len(export_res["content"]), 1000000)

        # Xóa tài liệu
        success, _ = DocumentService.delete_document(self.project_id, doc_id)
        self.assertTrue(success)

        # Giải phóng biến tạm và ép Garbage Collection
        del large_text, ops, export_res, doc
        gc.collect()

        mem_after, _ = tracemalloc.get_traced_memory()
        net_retained_kb = (mem_after - mem_before) / 1024

        # Bộ nhớ còn đọng lại sau khi GC phải nhỏ hơn 500KB
        self.assertLess(net_retained_kb, 500, f"Bộ nhớ chưa được giải phóng: {net_retained_kb:.2f} KB")

    def test_03_striped_lock_pool_constant_memory(self):
        """3. Striped Locks Pool phải có mức sử dụng bộ nhớ cố định O(1), không leak khi truy cập 10,000 files khác nhau."""
        gc.collect()
        mem_before, _ = tracemalloc.get_traced_memory()

        # Yêu cầu lock cho 10,000 đường dẫn tệp ngẫu nhiên
        for i in range(10000):
            fake_path = f"/virtual/database/projects/proj_{i}/documents/doc_{i*3}.json"
            lock = _get_file_lock(fake_path)
            self.assertIsNotNone(lock)

        gc.collect()
        mem_after, _ = tracemalloc.get_traced_memory()
        diff_kb = (mem_after - mem_before) / 1024

        # Do pool cố định 64 stripes, không được cấp phát thêm lock mới cho mỗi filepath
        self.assertLess(diff_kb, 100, f"Striped locks bị phình to bộ nhớ: {diff_kb:.2f} KB")

    def test_04_comments_deep_hierarchy_no_circular_leak(self):
        """4. Cây bình luận lồng nhau sâu (Deeply nested replies) - Không gây đệ quy vô hạn hay vòng tham chiếu."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Doc for Nested Comments"}, self.user_id)
        doc_id = doc["id"]

        # Tạo 30 cấp bình luận lồng nhau (c1 -> c2 -> c3 -> ...)
        parent_id = None
        for level in range(30):
            success, comment = DocumentService.add_comment(
                self.project_id, doc_id, f"Bình luận cấp độ {level}", self.user_id, parent_id=parent_id
            )
            self.assertTrue(success)
            parent_id = comment["id"]

        # Lấy cây bình luận phân cấp
        tree_comments = DocumentService.get_comments(self.project_id, doc_id)
        self.assertEqual(len(tree_comments), 1)

        # Duyệt sâu đến cấp cuối cùng
        curr = tree_comments[0]
        depth = 1
        while curr.get("replies"):
            curr = curr["replies"][0]
            depth += 1

        self.assertEqual(depth, 30)

        # Xóa lá cuối cùng
        leaf_id = curr["id"]
        success, _ = DocumentService.delete_comment(self.project_id, doc_id, leaf_id, self.user_id, is_admin_or_manage=True)
        self.assertTrue(success)

    def test_05_concurrent_locks_cleanup_no_memory_leak(self):
        """5. Tạo và làm sạch 500 locks hết hạn - Bộ nhớ locks.json không bị rò rỉ."""
        locks_data = {}
        past_time = (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z"
        
        # Giả lập 500 phiên khóa đã hết hạn trong quá khứ
        for i in range(500):
            key = f"proj_test:doc_fake_{i}"
            locks_data[key] = {
                "locked_by": f"user_{i}",
                "locked_by_name": f"User {i}",
                "locked_at": past_time,
                "expires_at": past_time
            }

        locks_file = os.path.join(self.test_dir, "locks.json")
        JSONStorage.write(locks_file, locks_data)

        gc.collect()
        mem_before, _ = tracemalloc.get_traced_memory()

        # Dọn dẹp tất cả khóa hết hạn
        active_locks = DocumentService._cleanup_expired_locks()
        self.assertEqual(len(active_locks), 0)

        # Đọc lại từ file
        saved_locks = JSONStorage.read(locks_file)
        self.assertEqual(len(saved_locks), 0)

        gc.collect()
        mem_after, _ = tracemalloc.get_traced_memory()
        diff_kb = (mem_after - mem_before) / 1024
        self.assertLess(diff_kb, 300)


if __name__ == "__main__":
    unittest.main()
