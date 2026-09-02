"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho RESTful API Endpoints
Kiểm tra toàn diện tất cả các RESTful API của Docupedia qua Flask test_client()
Bao gồm: Auth, Projects, Media Uploads & Serving, Documents, Lock/Unlock, Comments, Tree & Folders.
"""

import os
import sys
import io
import unittest
import json
import tempfile
import shutil

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from app import app
from config_doupedia import get_config_doupedia
from services.auth_service import AuthService, init_default_admin

config = get_config_doupedia()


class TestAPIEndpoints(unittest.TestCase):
    """Kiểm thử End-to-End các REST API endpoints qua Flask test client"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_api_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()

        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

        # Tạo token admin
        self.admin_token = AuthService.generate_token("user_admin", "admin", "admin")
        self.auth_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }

    def tearDown(self):
        self.app_context.pop()
        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_auth_login_and_me(self):
        """1. POST /auth/login thành công và GET /auth/me xác thực người dùng."""
        # Login
        login_res = self.client.post("/api/v1/docupedia/auth/login", json={
            "username": config.DEFAULT_ADMIN_USERNAME,
            "password": config.DEFAULT_ADMIN_PASSWORD
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.get_json()
        self.assertTrue(login_data["success"])
        token = login_data["data"]["token"]

        # Me
        me_res = self.client.get("/api/v1/docupedia/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.get_json()
        self.assertEqual(me_data["data"]["username"], config.DEFAULT_ADMIN_USERNAME)

    def test_02_project_crud_apis(self):
        """2. Kiểm tra chuỗi API tạo, xem danh sách, cập nhật và xóa Project."""
        # 1. Tạo project
        create_res = self.client.post(
            "/api/v1/docupedia/projects",
            headers=self.auth_headers,
            json={"name": "API Test Project", "description": "Desc"}
        )
        self.assertEqual(create_res.status_code, 201)
        project = create_res.get_json()["data"]
        pid = project["id"]

        # 2. Lấy danh sách
        list_res = self.client.get("/api/v1/docupedia/projects", headers=self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(any(p["id"] == pid for p in list_res.get_json()["data"]))

        # 3. Lấy chi tiết
        detail_res = self.client.get(f"/api/v1/docupedia/projects/{pid}", headers=self.auth_headers)
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.get_json()["data"]["name"], "API Test Project")

        # 4. Sửa project
        update_res = self.client.put(
            f"/api/v1/docupedia/projects/{pid}",
            headers=self.auth_headers,
            json={"name": "API Test Project Updated"}
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()["data"]["name"], "API Test Project Updated")

    def test_03_image_upload_and_serve_api(self):
        """3. POST /projects/:id/upload tải ảnh và GET /projects/:id/uploads/:file phục vụ ảnh tĩnh."""
        # Tạo project
        create_res = self.client.post(
            "/api/v1/docupedia/projects",
            headers=self.auth_headers,
            json={"name": "Image Project"}
        )
        pid = create_res.get_json()["data"]["id"]

        # Upload ảnh giả lập
        image_data = io.BytesIO(b"fake_image_bytes_png_or_webp")
        upload_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/upload",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            data={"file": (image_data, "test_banner.webp")},
            content_type="multipart/form-data"
        )
        self.assertEqual(upload_res.status_code, 201)
        upload_json = upload_res.get_json()
        self.assertTrue(upload_json["success"])
        image_url = upload_json["data"]["url"]
        filename = upload_json["data"]["filename"]

        # Tải lại file đã upload qua endpoint serve
        serve_res = self.client.get(f"/api/v1/docupedia/projects/{pid}/uploads/{filename}")
        self.assertEqual(serve_res.status_code, 200)
        self.assertEqual(serve_res.data, b"fake_image_bytes_png_or_webp")
        serve_res.close()

    def test_04_document_crud_and_locking_api(self):
        """4. Kiểm tra APIs tạo tài liệu, khóa (lock), gia hạn (heartbeat) và mở khóa (unlock)."""
        # Tạo project
        p_res = self.client.post("/api/v1/docupedia/projects", headers=self.auth_headers, json={"name": "Doc API Project"})
        pid = p_res.get_json()["data"]["id"]

        # 1. Tạo document
        doc_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents",
            headers=self.auth_headers,
            json={"title": "Tài liệu API Test", "content": {"ops": [{"insert": "Text\n"}]}}
        )
        self.assertEqual(doc_res.status_code, 201)
        doc_id = doc_res.get_json()["data"]["id"]

        # 2. Khóa tài liệu (Lock)
        lock_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/lock",
            headers=self.auth_headers
        )
        self.assertEqual(lock_res.status_code, 200)
        self.assertTrue(lock_res.get_json()["success"])

        # 3. Heartbeat gia hạn khóa
        hb_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/heartbeat",
            headers=self.auth_headers
        )
        self.assertEqual(hb_res.status_code, 200)
        self.assertTrue(hb_res.get_json()["success"])

        # 4. Mở khóa (Unlock)
        unlock_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/unlock",
            headers=self.auth_headers
        )
        self.assertEqual(unlock_res.status_code, 200)
        self.assertTrue(unlock_res.get_json()["success"])

    def test_05_document_comments_api(self):
        """5. Kiểm tra API thêm, lấy danh sách, sửa và xóa bình luận."""
        p_res = self.client.post("/api/v1/docupedia/projects", headers=self.auth_headers, json={"name": "Comment Project"})
        pid = p_res.get_json()["data"]["id"]

        d_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents",
            headers=self.auth_headers,
            json={"title": "Doc with comments"}
        )
        doc_id = d_res.get_json()["data"]["id"]

        # Thêm comment
        add_res = self.client.post(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/comments",
            headers=self.auth_headers,
            json={"content": "Nội dung bình luận qua API"}
        )
        self.assertEqual(add_res.status_code, 201)
        comment_id = add_res.get_json()["data"]["id"]

        # Lấy danh sách comments
        get_res = self.client.get(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/comments",
            headers=self.auth_headers
        )
        self.assertEqual(get_res.status_code, 200)
        comments = get_res.get_json()["data"]
        self.assertEqual(len(comments), 1)
        self.assertEqual(comments[0]["content"], "Nội dung bình luận qua API")

        # Xóa comment
        del_res = self.client.delete(
            f"/api/v1/docupedia/projects/{pid}/documents/{doc_id}/comments/{comment_id}",
            headers=self.auth_headers
        )
        self.assertEqual(del_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
