"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho AuthService và UserService
Kiểm tra băm mật khẩu, tạo/giải mã JWT token, đăng nhập, đổi mật khẩu và quản lý người dùng.
"""

import os
import sys
import unittest
import tempfile
import shutil
from datetime import datetime, timedelta
import jwt

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from config_doupedia import get_config_doupedia
from services.auth_service import AuthService, init_default_admin
from services.user_service import UserService
from utils.json_storage import JSONStorage

config = get_config_doupedia()


class TestAuthService(unittest.TestCase):
    """Kiểm tra toàn diện AuthService, UserService & JWT Security"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="docupedia_test_auth_")
        self.orig_env = os.environ.get("ROOT_DATABASE_DIR")
        os.environ["ROOT_DATABASE_DIR"] = self.test_dir

        init_default_admin()

    def tearDown(self):
        if self.orig_env is not None:
            os.environ["ROOT_DATABASE_DIR"] = self.orig_env
        else:
            os.environ.pop("ROOT_DATABASE_DIR", None)

        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_password_hashing_and_verification(self):
        """1. Kiểm tra mã hóa mật khẩu PBKDF2/SHA256 và so khớp đúng/sai."""
        raw_pw = "SuperSecret_Docupedia_2026"
        hashed = AuthService.hash_password(raw_pw)

        self.assertNotEqual(raw_pw, hashed)
        self.assertTrue(AuthService.verify_password(raw_pw, hashed))
        self.assertFalse(AuthService.verify_password("wrong_password", hashed))
        self.assertFalse(AuthService.verify_password("", hashed))

    def test_02_jwt_token_generation_and_decoding(self):
        """2. Kiểm tra tạo JWT Token và giải mã payload thành công."""
        user_id = "usr_001"
        username = "editor_john"
        role = "editor"

        token = AuthService.generate_token(user_id, username, role)
        self.assertIsInstance(token, str)
        self.assertEqual(len(token.split(".")), 3)

        payload = AuthService.decode_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["user_id"], user_id)
        self.assertEqual(payload["username"], username)
        self.assertEqual(payload["role"], role)

    def test_03_tampered_jwt_token_rejected(self):
        """3. Kiểm tra từ chối token bị can thiệp chữ ký số."""
        token = AuthService.generate_token("u1", "user1", "user")
        parts = token.split(".")
        tampered_token = f"{parts[0]}.{parts[1]}.fake_signature_part"

        decoded = AuthService.decode_token(tampered_token)
        self.assertIsNone(decoded)

    def test_04_expired_jwt_token_rejected(self):
        """4. Kiểm tra từ chối token khi đã hết hạn."""
        payload = {
            'user_id': 'u1',
            'username': 'user1',
            'role': 'user',
            'exp': datetime.utcnow() - timedelta(minutes=10),
            'iat': datetime.utcnow() - timedelta(minutes=20)
        }
        expired_token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)
        if isinstance(expired_token, bytes):
            expired_token = expired_token.decode('utf-8')

        decoded = AuthService.decode_token(expired_token)
        self.assertIsNone(decoded)

    def test_05_default_admin_initialization(self):
        """5. Kiểm tra khởi tạo tài khoản admin mặc định."""
        admin_user = JSONStorage.find_by_field(config.USERS_FILE, 'users', 'username', config.DEFAULT_ADMIN_USERNAME)
        self.assertIsNotNone(admin_user)
        self.assertEqual(admin_user["role"], "admin")
        self.assertTrue(AuthService.verify_password(config.DEFAULT_ADMIN_PASSWORD, admin_user["password_hash"]))

    def test_06_authenticate_success_and_failure(self):
        """6. Kiểm tra xác thực đăng nhập thành công và thất bại."""
        # Đăng nhập admin đúng
        success, user_data, token = AuthService.login(config.DEFAULT_ADMIN_USERNAME, config.DEFAULT_ADMIN_PASSWORD)
        self.assertTrue(success)
        self.assertIsNotNone(token)
        self.assertIsNotNone(user_data)
        self.assertEqual(user_data["username"], config.DEFAULT_ADMIN_USERNAME)

        # Sai mật khẩu
        success, user_data, err = AuthService.login(config.DEFAULT_ADMIN_USERNAME, "wrong_pw")
        self.assertFalse(success)
        self.assertIn("không chính xác", err)

        # Sai tài khoản
        success, user_data, err = AuthService.login("non_existent_user", "123456")
        self.assertFalse(success)
        self.assertIn("không tồn tại", err)

    def test_07_register_and_create_user(self):
        """7. Kiểm tra tạo người dùng mới và chống trùng lặp username."""
        reg_data = {
            "username": "tester1",
            "password": "Password123@",
            "display_name": "Tester One",
            "email": "tester1@example.com"
        }
        success, user = UserService.create_user(reg_data)
        self.assertTrue(success)
        self.assertEqual(user["username"], "tester1")
        self.assertNotIn("password_hash", user)  # Không được lộ hash trong response

        # Đăng ký trùng username
        success, err = UserService.create_user(reg_data)
        self.assertFalse(success)
        self.assertIn("đã tồn tại", err)


if __name__ == "__main__":
    unittest.main()
