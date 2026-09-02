"""
Docupedia Unit Test Suite Runner
Tự động quét và thực thi toàn bộ các bài kiểm thử đơn vị trong thư mục src/unit_tests
"""

import os
import sys
import unittest
import time
import io

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(SRC_DIR, ".."))

if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass


def run_test_suite():
    print("=" * 70)
    print("      DOCUPEDIA BACKEND UNIT TEST SUITE (Python unittest)")
    print("=" * 70)
    print(f"[Runner] Quét thư mục test: {CURRENT_DIR}")
    
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=CURRENT_DIR, pattern="test_*.py")
    
    start_time = time.time()
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    elapsed = time.time() - start_time
    
    print("\n" + "=" * 70)
    print(f"Tổng số test cases đã chạy: {result.testsRun}")
    print(f"Thành công: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Thất bại (Failures): {len(result.failures)}")
    print(f"Lỗi (Errors): {len(result.errors)}")
    print(f"Thời gian thực thi: {elapsed:.2f} giây")
    print("=" * 70)
    
    if result.wasSuccessful():
        print(">>> KẾT QUẢ: TẤT CẢ UNIT TESTS ĐÃ VƯỢT QUA THÀNH CÔNG (100% PASSED) <<<")
        return 0
    else:
        print(">>> KẾT QUẢ: CÓ BÀI TEST BỊ THẤT BẠI HOẶC GẶP LỖI <<<")
        return 1


if __name__ == "__main__":
    exit_code = run_test_suite()
    sys.exit(exit_code)
