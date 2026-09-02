"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho ProjectService, FolderService và TreeService
Kiểm tra vòng đời Project, Folder, đồng bộ cấu trúc cây thư mục (Tree hierarchy) và xóa đệ quy.
"""

import os
import sys
import unittest
import tempfile
import shutil

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from config_doupedia import get_config_doupedia
from services.project_service import ProjectService
from services.folder_service import FolderService
from services.tree_service import TreeService
from services.auth_service import init_default_admin
from utils.json_storage import JSONStorage

config = get_config_doupedia()


class TestProjectAndFolderService(unittest.TestCase):
    """Kiểm tra quản lý Dự án, Thư mục và Cây phân cấp Tree"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_proj_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()
        self.user_id = "user_author_01"

    def tearDown(self):
        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_create_and_get_project(self):
        """1. Tạo dự án mới và tự động khởi tạo cấu trúc thư mục / tree.json."""
        proj_data = {
            "name": "Dự án Hướng dẫn Kỹ thuật",
            "description": "Tài liệu kỹ thuật nội bộ",
            "is_public": False
        }
        success, project = ProjectService.create_project(proj_data, self.user_id)
        self.assertTrue(success)
        self.assertIn("id", project)
        self.assertEqual(project["owner_id"], self.user_id)

        # Kiểm tra đọc lại
        loaded = ProjectService.get_project_by_id(project["id"])
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["name"], proj_data["name"])

        # Kiểm tra tree.json được tạo tự động
        tree = TreeService.get_tree(project["id"])
        self.assertIsNotNone(tree)
        self.assertIn("root", tree)
        self.assertIn("nodes", tree)

    def test_02_update_and_delete_project(self):
        """2. Cập nhật thông tin dự án và xóa toàn bộ dữ liệu dự án."""
        _, project = ProjectService.create_project({"name": "Dự án cũ"}, self.user_id)
        pid = project["id"]

        # Cập nhật
        success, updated = ProjectService.update_project(pid, {"name": "Dự án mới", "is_public": True})
        self.assertTrue(success)
        self.assertEqual(updated["name"], "Dự án mới")
        self.assertTrue(updated["is_public"])

        # Xóa
        success, msg = ProjectService.delete_project(pid)
        self.assertTrue(success)
        self.assertIsNone(ProjectService.get_project_by_id(pid))

    def test_03_folder_lifecycle_and_tree_sync(self):
        """3. Tạo thư mục, cập nhật, di chuyển và đồng bộ với TreeService."""
        _, project = ProjectService.create_project({"name": "Project with Folders"}, self.user_id)
        pid = project["id"]

        # 1. Tạo thư mục con cấp 1 (parent: root)
        f1_data = {"title": "Chương 1: Mở đầu", "parent_id": "root"}
        success, folder1 = FolderService.create_folder(pid, f1_data, self.user_id)
        self.assertTrue(success)
        f1_id = folder1["id"]

        # Kiểm tra xuất hiện trong tree.json
        tree = TreeService.get_tree(pid)
        self.assertIn(f1_id, tree["root"]["children"])
        self.assertIn(f1_id, tree["nodes"])

        # 2. Tạo thư mục con cấp 2 (parent: folder1)
        f2_data = {"title": "Mục 1.1: Cài đặt", "parent_id": f1_id}
        success, folder2 = FolderService.create_folder(pid, f2_data, self.user_id)
        self.assertTrue(success)
        f2_id = folder2["id"]

        tree = TreeService.get_tree(pid)
        self.assertIn(f2_id, tree["nodes"][f1_id]["children"])

        # 3. Đổi tên thư mục
        success, renamed = FolderService.update_folder(pid, f1_id, {"title": "Chương 1: Tổng quan"})
        self.assertTrue(success)
        self.assertEqual(renamed["title"], "Chương 1: Tổng quan")

        # 4. Di chuyển folder2 ra ngoài root qua TreeService
        TreeService.move_node(pid, f2_id, f1_id, "root")
        tree = TreeService.get_tree(pid)
        self.assertIn(f2_id, tree["root"]["children"])
        self.assertNotIn(f2_id, tree["nodes"][f1_id].get("children", []))

        # 5. Xóa thư mục
        success, msg = FolderService.delete_folder(pid, f1_id)
        self.assertTrue(success)
        self.assertIsNone(FolderService.get_folder(pid, f1_id))


if __name__ == "__main__":
    unittest.main()
