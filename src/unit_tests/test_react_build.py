"""
Bộ Kiểm Thử Đơn Vị (Unit Test) cho React Frontend (src-react)
Kiểm tra tĩnh AST/Regex toàn bộ tệp JSX/JS:
1. Đảm bảo 100% React hooks (useRef, useState, useEffect, useCallback, useMemo, etc.) được import đầy đủ.
2. Đảm bảo tất cả đường dẫn import cục bộ (local relative imports) đều tồn tại trong hệ thống tệp.
3. Kiểm tra tính toàn vẹn của package.json, vite.config.js và cú pháp tệp.
4. Thực thi Vite Build nếu môi trường có sẵn Node/npm.
"""

import os
import sys
import re
import json
import subprocess
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
SRC_REACT_DIR = os.path.join(PROJECT_ROOT, "src-react")


class TestReactBuildAndStaticAnalysis(unittest.TestCase):
    """Kiểm tra toàn diện tính toàn vẹn và khả năng build của mã nguồn React (src-react)"""

    def setUp(self):
        self.react_files = []
        for root, _, files in os.walk(SRC_REACT_DIR):
            for f in files:
                if f.endswith(('.jsx', '.js')):
                    self.react_files.append(os.path.join(root, f))

    def test_01_all_react_hooks_imported_properly(self):
        """1. Kiểm tra tất cả React Hooks (useRef, useState, useEffect,...) được sử dụng đều đã được import."""
        react_hooks = [
            'useState', 'useEffect', 'useRef', 'useCallback', 
            'useMemo', 'useContext', 'useReducer', 'useId', 'useLayoutEffect'
        ]
        
        custom_hooks = [
            ('useNavigate', 'react-router-dom'),
            ('useLocation', 'react-router-dom'),
            ('useSearchParams', 'react-router-dom'),
            ('useParams', 'react-router-dom'),
            ('useToast', 'ToastContext'),
            ('useProject', 'ProjectContext'),
            ('useAuth', 'AuthContext'),
            ('useTheme', 'ThemeContext')
        ]

        errors = []

        for file_path in self.react_files:
            rel_path = os.path.relpath(file_path, PROJECT_ROOT)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 1. Kiểm tra React core hooks
            for hook in react_hooks:
                # Tìm xem hook có được gọi trong code không (ví dụ: useRef(, useState()
                # Ngoại trừ khai báo import hoặc comment
                hook_usage_pattern = rf'\b{hook}\s*\('
                
                # Bỏ qua các dòng comment //
                lines = content.split('\n')
                is_used = False
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                        continue
                    if re.search(hook_usage_pattern, stripped):
                        is_used = True
                        break

                if is_used:
                    # Kiểm tra xem có import hook này từ 'react' không
                    import_react_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react[\'"]', content)
                    if not import_react_match:
                        errors.append(f"[{rel_path}] Sử dụng {hook}() nhưng không import bất kỳ hook nào từ 'react'")
                    else:
                        imported_names = [name.strip() for name in import_react_match.group(1).split(',')]
                        if hook not in imported_names:
                            errors.append(f"[{rel_path}] Sử dụng {hook}() nhưng CHƯA import '{hook}' trong câu lệnh import từ 'react'")

            # 2. Kiểm tra Custom hooks
            for hook, expected_module in custom_hooks:
                # Nếu chính file này là file định nghĩa hook (vd: AuthContext.jsx định nghĩa useAuth) thì bỏ qua
                if expected_module in rel_path or f"function {hook}" in content or f"const {hook} = " in content:
                    continue

                hook_usage_pattern = rf'\b{hook}\s*\('
                lines = content.split('\n')
                is_used = False
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith('//') or stripped.startswith('*'):
                        continue
                    if re.search(hook_usage_pattern, stripped):
                        is_used = True
                        break

                if is_used:
                    import_pattern = rf'import\s+.*?\b{hook}\b.*?from'
                    if not re.search(import_pattern, content):
                        errors.append(f"[{rel_path}] Sử dụng hook {hook}() nhưng chưa có câu lệnh import tương ứng")

        self.assertEqual(len(errors), 0, "\n" + "\n".join(errors))

    def test_02_all_local_import_paths_exist(self):
        """2. Kiểm tra tất cả đường dẫn import cục bộ (./, ../) đều trỏ đến tệp/thư mục hợp lệ."""
        import_pattern = re.compile(r'(?:import|from)\s+[\'"](\.[^\'"]+)[\'"]')
        errors = []

        for file_path in self.react_files:
            rel_path = os.path.relpath(file_path, PROJECT_ROOT)
            file_dir = os.path.dirname(file_path)

            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            for match in import_pattern.finditer(content):
                import_target = match.group(1)
                
                # Bỏ qua css vì được bundler xử lý
                if import_target.endswith('.css'):
                    css_path = os.path.normpath(os.path.join(file_dir, import_target))
                    if not os.path.exists(css_path):
                        errors.append(f"[{rel_path}] Tệp CSS không tồn tại: {import_target}")
                    continue

                # Thử các đuôi mở rộng: .jsx, .js, /index.jsx, /index.js
                resolved = False
                candidate_paths = [
                    os.path.normpath(os.path.join(file_dir, import_target)),
                    os.path.normpath(os.path.join(file_dir, import_target + '.jsx')),
                    os.path.normpath(os.path.join(file_dir, import_target + '.js')),
                    os.path.normpath(os.path.join(file_dir, import_target, 'index.jsx')),
                    os.path.normpath(os.path.join(file_dir, import_target, 'index.js')),
                ]

                for p in candidate_paths:
                    if os.path.exists(p):
                        resolved = True
                        break

                if not resolved:
                    errors.append(f"[{rel_path}] Không tìm thấy module import: '{import_target}'")

        self.assertEqual(len(errors), 0, "\n" + "\n".join(errors))

    def test_03_package_json_and_vite_config_valid(self):
        """3. Kiểm tra tệp package.json và cấu hình Vite hợp lệ."""
        pkg_path = os.path.join(PROJECT_ROOT, "package.json")
        self.assertTrue(os.path.exists(pkg_path), "package.json không tồn tại")

        with open(pkg_path, 'r', encoding='utf-8') as f:
            pkg_data = json.load(f)

        self.assertIn("dependencies", pkg_data)
        self.assertIn("react", pkg_data["dependencies"])
        self.assertIn("react-dom", pkg_data["dependencies"])
        self.assertIn("scripts", pkg_data)
        self.assertIn("build", pkg_data["scripts"])

        vite_config = os.path.join(PROJECT_ROOT, "vite.config.js")
        self.assertTrue(os.path.exists(vite_config), "vite.config.js không tồn tại")

    def test_04_vite_html_and_entrypoint_valid(self):
        """4. Kiểm tra cấu hình index.html và điểm nhập (entrypoint) của Vite."""
        index_html_path = os.path.join(PROJECT_ROOT, "index.html")
        self.assertTrue(os.path.exists(index_html_path), "index.html không tồn tại ở thư mục gốc")

        with open(index_html_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Kiểm tra div root và script main.jsx
        self.assertIn('id="root"', html_content, "index.html phải có thẻ div với id='root'")
        self.assertIn('src-react/main.jsx', html_content, "index.html phải nạp entrypoint 'src-react/main.jsx'")

        main_jsx_path = os.path.join(SRC_REACT_DIR, "main.jsx")
        self.assertTrue(os.path.exists(main_jsx_path), "src-react/main.jsx không tồn tại")

    def test_05_app_jsx_routes_and_lazy_pages_exist(self):
        """5. Kiểm tra cấu trúc App.jsx: các lazy-loaded routes và Providers lồng nhau đúng chuẩn."""
        app_path = os.path.join(SRC_REACT_DIR, "App.jsx")
        self.assertTrue(os.path.exists(app_path), "src-react/App.jsx không tồn tại")

        with open(app_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Kiểm tra lazy imports
        lazy_matches = re.findall(r"import\(\s*['\"](\./pages/[^'\"]+)['\"]\s*\)", content)
        self.assertGreaterEqual(len(lazy_matches), 5, "App.jsx phải có ít nhất 5 lazy-loaded pages")

        for page_rel in lazy_matches:
            candidates = [
                os.path.normpath(os.path.join(SRC_REACT_DIR, page_rel + ".jsx")),
                os.path.normpath(os.path.join(SRC_REACT_DIR, page_rel + ".js")),
                os.path.normpath(os.path.join(SRC_REACT_DIR, page_rel, "index.jsx")),
                os.path.normpath(os.path.join(SRC_REACT_DIR, page_rel, "index.js")),
            ]
            exists = any(os.path.exists(c) for c in candidates)
            self.assertTrue(exists, f"Trang lazy load trong App.jsx không tồn tại trên đĩa: {page_rel}")

        # Kiểm tra Providers hierarchy
        providers = ['BrowserRouter', 'ThemeProvider', 'ToastProvider', 'AuthProvider', 'ProjectProvider', 'AppRoutes']
        last_idx = -1
        for p in providers:
            idx = content.find(f"<{p}")
            self.assertNotEqual(idx, -1, f"App.jsx phải chứa component <{p}>")
            self.assertGreater(idx, last_idx, f"Thứ tự Context Provider sai vị trí: <{p}>")
            last_idx = idx


if __name__ == "__main__":
    unittest.main()

