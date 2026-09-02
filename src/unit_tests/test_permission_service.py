"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho PermissionService
Kiểm tra ma trận phân quyền RBAC: Admin, Owner, Project-level Permissions và chuyển đổi định dạng quyền.
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
from services.permission_service import PermissionService
from services.project_service import ProjectService
from services.user_service import UserService
from services.auth_service import init_default_admin
from utils.json_storage import JSONStorage

config = get_config_doupedia()


class TestPermissionService(unittest.TestCase):
    """Kiểm tra toàn diện phân quyền và bảo vệ tài nguyên"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_perms_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()

        # Tạo user owner và member
        _, self.owner = UserService.create_user({
            "username": "owner_user", "password": "Password123@", "display_name": "Owner"
        })
        self.owner_id = self.owner["id"]

        _, self.member = UserService.create_user({
            "username": "member_user", "password": "Password123@", "display_name": "Member"
        })
        self.member_id = self.member["id"]

        # Tạo project mẫu
        _, self.project = ProjectService.create_project({
            "name": "Dự án kiểm thử phân quyền",
            "is_public": False
        }, self.owner_id)
        self.project_id = self.project["id"]

    def tearDown(self):
        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_admin_has_all_permissions(self):
        """1. Quản trị viên hệ thống (role: admin) luôn có full quyền trong mọi dự án."""
        perms = PermissionService.get_user_permissions("any_user_id", self.project_id, user_role="admin")
        self.assertEqual(set(perms), {'view', 'create', 'edit', 'delete', 'manage'})

    def test_02_project_owner_has_all_permissions(self):
        """2. Chủ sở hữu dự án (owner) có đầy đủ các quyền."""
        perms = PermissionService.get_user_permissions(self.owner_id, self.project_id, user_role="user")
        self.assertEqual(set(perms), {'view', 'create', 'edit', 'delete', 'manage'})

    def test_03_unauthorized_user_has_no_permissions(self):
        """3. Người dùng chưa được gán quyền sẽ nhận danh sách quyền rỗng []."""
        perms = PermissionService.get_user_permissions("random_stranger", self.project_id, user_role="user")
        self.assertEqual(perms, [])

    def test_04_grant_and_update_permissions(self):
        """4. Cấp quyền và cập nhật quyền cho người dùng thành viên."""
        # Gán quyền view & edit
        success, perm_record = PermissionService.grant_permission(
            self.project_id, self.member_id, ["view", "edit"], granted_by=self.owner_id
        )
        self.assertTrue(success)

        perms = PermissionService.get_user_permissions(self.member_id, self.project_id, user_role="user")
        self.assertIn("view", perms)
        self.assertIn("edit", perms)
        self.assertNotIn("delete", perms)

        # Cập nhật thêm quyền delete
        success, updated = PermissionService.update_permission(
            self.project_id, self.member_id, ["view", "edit", "delete"]
        )
        self.assertTrue(success)
        perms_after = PermissionService.get_user_permissions(self.member_id, self.project_id, user_role="user")
        self.assertIn("delete", perms_after)

    def test_05_revoke_permission(self):
        """5. Thu hồi quyền thành viên khỏi dự án."""
        PermissionService.grant_permission(
            self.project_id, self.member_id, ["view"], granted_by=self.owner_id
        )

        # Thu hồi
        success, msg = PermissionService.revoke_permission(self.project_id, self.member_id)
        self.assertTrue(success)

        perms = PermissionService.get_user_permissions(self.member_id, self.project_id, user_role="user")
        self.assertEqual(perms, [])

    def test_06_convert_dict_permissions_to_list(self):
        """6. Chuyển đổi format quyền từ dict (frontend UI checkbox) sang list chuẩn."""
        perms_dict = {"view": True, "edit": True, "delete": False}
        perms_list = PermissionService._convert_permissions_to_list(perms_dict)

        self.assertIn("view", perms_list)
        self.assertIn("edit", perms_list)
        self.assertIn("create", perms_list)
        self.assertNotIn("delete", perms_list)


if __name__ == "__main__":
    unittest.main()
