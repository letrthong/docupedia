"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho DocumentService
Kiểm tra vòng đời tài liệu, cơ chế khóa tài liệu (Document Lock & Heartbeat & Expiration),
hệ thống bình luận (Comments & Replies), Lịch sử chỉnh sửa và Xuất HTML.
"""

import os
import sys
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
from services.tree_service import TreeService
from services.auth_service import init_default_admin
from utils.json_storage import JSONStorage

config = get_config_doupedia()


class TestDocumentService(unittest.TestCase):
    """Kiểm tra toàn diện DocumentService, Khóa chỉnh sửa, Comments và History"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_doc_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()

        # Tạo users
        _, u1 = UserService.create_user({
            "username": "author_user", "password": "Password123@", "display_name": "Author"
        })
        self.user1 = u1["id"]

        _, u2 = UserService.create_user({
            "username": "editor_user", "password": "Password123@", "display_name": "Editor"
        })
        self.user2 = u2["id"]

        # Tạo dự án mẫu
        _, project = ProjectService.create_project({"name": "Dự án Tài liệu"}, self.user1)
        self.project_id = project["id"]

    def tearDown(self):
        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_create_and_get_document(self):
        """1. Tạo tài liệu mới với Delta content và đồng bộ metadata vào tree.json."""
        doc_data = {
            "title": "Kiến trúc hệ thống",
            "parent_id": "root",
            "content": {
                "ops": [
                    {"insert": "Xin chào thế giới!\n"},
                    {"insert": "Docupedia 2026", "attributes": {"bold": True}}
                ]
            }
        }
        success, doc = DocumentService.create_document(self.project_id, doc_data, self.user1)
        self.assertTrue(success)
        self.assertIn("id", doc)
        doc_id = doc["id"]

        # Kiểm tra đọc lại
        loaded = DocumentService.get_document(self.project_id, doc_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["title"], doc_data["title"])
        self.assertEqual(len(loaded["content"]["ops"]), 2)

        # Kiểm tra metadata trong tree.json
        tree = TreeService.get_tree(self.project_id)
        self.assertIn(doc_id, tree["root"]["children"])
        self.assertEqual(tree["nodes"][doc_id]["title"], doc_data["title"])

    def test_02_update_document_and_history_logging(self):
        """2. Cập nhật tài liệu và tự động ghi log vào file history.json."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Tiêu đề cũ"}, self.user1)
        doc_id = doc["id"]

        # Cập nhật
        update_data = {
            "title": "Tiêu đề mới",
            "content": {"ops": [{"insert": "Nội dung cập nhật mới\n"}]}
        }
        success, updated = DocumentService.update_document(self.project_id, doc_id, update_data, self.user1)
        self.assertTrue(success)
        self.assertEqual(updated["title"], "Tiêu đề mới")

        # Kiểm tra lịch sử
        history = DocumentService.get_history(self.project_id, doc_id)
        self.assertGreaterEqual(len(history), 2)  # 1 entry create + 1 entry update
        actions = [h["action"] for h in history]
        self.assertIn("create", actions)
        self.assertIn("update", actions)

    def test_03_document_lock_concurrency_protection(self):
        """3. Kiểm tra cơ chế khóa tài liệu tránh chỉnh sửa đồng thời (Document Lock)."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Doc for lock test"}, self.user1)
        doc_id = doc["id"]

        # User 1 khóa tài liệu thành công
        success, lock_info = DocumentService.acquire_lock(self.project_id, doc_id, self.user1)
        self.assertTrue(success)
        self.assertEqual(lock_info["locked_by"], self.user1)

        # User 2 cố gắng khóa -> Bị từ chối
        success, err = DocumentService.acquire_lock(self.project_id, doc_id, self.user2)
        self.assertFalse(success)
        self.assertEqual(err.get("error_code"), "DOCUMENT_LOCKED")

        # User 2 cố gắng lưu đè -> Bị chặn
        success, update_err = DocumentService.update_document(
            self.project_id, doc_id, {"title": "User2 cố sửa"}, self.user2
        )
        self.assertFalse(success)
        self.assertIn("bị khóa", update_err)

        # User 1 mở khóa (release lock)
        released = DocumentService.release_lock(self.project_id, doc_id, self.user1)
        self.assertTrue(released)

        # User 2 giờ có thể khóa và chỉnh sửa
        success, lock_info2 = DocumentService.acquire_lock(self.project_id, doc_id, self.user2)
        self.assertTrue(success)
        self.assertEqual(lock_info2["locked_by"], self.user2)

    def test_04_comments_crud_and_nested_replies(self):
        """4. Kiểm tra hệ thống bình luận (Comments) bao gồm Base64 encode/decode và phân cấp replies."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Doc for comments"}, self.user1)
        doc_id = doc["id"]

        # 1. Thêm comment cấp 1
        success, comment1 = DocumentService.add_comment(
            self.project_id, doc_id, "Bình luận cấp 1 bằng tiếng Việt có dấu", self.user1
        )
        self.assertTrue(success)
        c1_id = comment1["id"]
        self.assertEqual(comment1["content"], "Bình luận cấp 1 bằng tiếng Việt có dấu")

        # 2. Thêm reply phản hồi cho comment1
        success, reply1 = DocumentService.add_comment(
            self.project_id, doc_id, "Phản hồi cho c1", self.user2, parent_id=c1_id
        )
        self.assertTrue(success)

        # 3. Lấy danh sách bình luận (dạng cây lồng nhau)
        tree_comments = DocumentService.get_comments(self.project_id, doc_id)
        self.assertEqual(len(tree_comments), 1)  # 1 top-level comment
        self.assertEqual(len(tree_comments[0]["replies"]), 1)
        self.assertEqual(tree_comments[0]["replies"][0]["id"], reply1["id"])

        # 4. Thử sửa bình luận đã có reply -> Bị chặn
        success, err = DocumentService.update_comment(
            self.project_id, doc_id, c1_id, "Sửa nội dung", self.user1, is_admin_or_manage=True
        )
        self.assertFalse(success)
        self.assertIn("đã có phản hồi", err)

        # 5. Thử xóa bình luận cha khi còn reply -> Bị chặn
        success, err = DocumentService.delete_comment(
            self.project_id, doc_id, c1_id, self.user1, is_admin_or_manage=True
        )
        self.assertFalse(success)
        self.assertIn("đã có phản hồi", err)

        # 6. Xóa reply trước -> Thành công
        success, msg = DocumentService.delete_comment(
            self.project_id, doc_id, reply1["id"], self.user2, is_admin_or_manage=True
        )
        self.assertTrue(success)

        # 7. Xóa bình luận cha sau khi hết reply -> Thành công
        success, msg = DocumentService.delete_comment(
            self.project_id, doc_id, c1_id, self.user1, is_admin_or_manage=True
        )
        self.assertTrue(success)

        comments_after = DocumentService.get_comments(self.project_id, doc_id)
        self.assertEqual(len(comments_after), 0)

    def test_05_export_document_html(self):
        """5. Kiểm tra xuất tài liệu ra HTML từ Quill Delta."""
        doc_data = {
            "title": "Báo cáo thử nghiệm",
            "content": {
                "ops": [
                    {"insert": "Dòng 1: Giới thiệu\n"},
                    {"insert": "Dòng 2: Nội dung chính\n"}
                ]
            }
        }
        _, doc = DocumentService.create_document(self.project_id, doc_data, self.user1)

        success, export_res = DocumentService.export_document(self.project_id, doc["id"], "html")
        self.assertTrue(success)
        self.assertIn("content", export_res)
        self.assertIn("<h1>Báo cáo thử nghiệm</h1>", export_res["content"])
        self.assertIn("Dòng 1: Giới thiệu", export_res["content"])

    def test_06_history_capping_max_50_entries(self):
        """6. Kiểm tra giới hạn số lượng bản ghi lịch sử (chỉ giữ 50 bản ghi gần nhất)."""
        _, doc = DocumentService.create_document(self.project_id, {"title": "Doc for History Capping"}, self.user1)
        doc_id = doc["id"]

        # Ghi thêm 70 bản ghi lịch sử
        for i in range(70):
            DocumentService.add_history_entry(
                self.project_id, doc_id, "update", self.user1, {"step": i, "note": f"Revision {i}"}
            )

        history = DocumentService.get_history(self.project_id, doc_id)
        # Tổng số bản ghi (kể cả create) bị giới hạn tối đa 50
        self.assertEqual(len(history), 50)
        # Bản ghi cuối cùng phải là Revision 69
        self.assertEqual(history[-1]["details"]["note"], "Revision 69")


if __name__ == "__main__":
    unittest.main()
