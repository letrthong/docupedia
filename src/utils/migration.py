import os
import sys
import time
import uuid
import base64
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config_doupedia import get_config_doupedia
from utils.json_storage import JSONStorage, get_timestamp

config = get_config_doupedia()

# Ngày hết hạn chạy migration (Ví dụ: sau ngày 22/08/2026 sẽ tự động dừng, không quét nữa)
MIGRATION_CUTOFF_DATE = datetime(2026, 8, 22, 23, 59, 59)


def run_data_migrations():
    """
    Tự động quét và nâng cấp dữ liệu cũ sang cấu trúc mới tối ưu:
    1. Trích xuất Base64 thành file ảnh tĩnh trong /uploads
    2. Cập nhật metadata vào tree.json
    
    Điều kiện dừng:
    - Nếu đã chạy thành công trước đó (lưu flag trong migration_status.json)
    - HOẶC thời gian hiện tại đã vượt quá MIGRATION_CUTOFF_DATE
    """
    now = datetime.now()
    if now > MIGRATION_CUTOFF_DATE:
        print(f"[Migration] Bỏ qua migration: Đã quá hạn ngày {MIGRATION_CUTOFF_DATE.strftime('%d/%m/%Y')}.")
        return

    status_file = os.path.join(config.ROOT_DATABASE_DIR, 'migration_status.json')
    status_data = JSONStorage.read(status_file)

    # Nếu migration này đã từng hoàn thành thì bỏ qua ngay lập tức
    if status_data.get('v1_base64_and_tree_migration') is True:
        return

    print("[Migration] Bắt đầu quét và tối ưu hóa dữ liệu cũ...")
    projects_dir = config.PROJECTS_DATA_DIR
    if not os.path.exists(projects_dir):
        return

    migrated_images_count = 0
    migrated_docs_count = 0

    for project_id in os.listdir(projects_dir):
        project_path = os.path.join(projects_dir, project_id)
        if not os.path.isdir(project_path):
            continue

        docs_dir = os.path.join(project_path, 'docs')
        uploads_dir = os.path.join(project_path, 'uploads')
        tree_file = os.path.join(project_path, 'tree.json')

        if not os.path.exists(docs_dir):
            continue

        os.makedirs(uploads_dir, exist_ok=True)
        tree = JSONStorage.read(tree_file) if os.path.exists(tree_file) else {'nodes': {}, 'root': {'children': []}}
        if 'nodes' not in tree:
            tree['nodes'] = {}

        for filename in os.listdir(docs_dir):
            if not filename.endswith('.json') or filename.endswith('_comments.json') or filename.endswith('_history.json'):
                continue

            filepath = os.path.join(docs_dir, filename)
            doc = JSONStorage.read(filepath)
            doc_id = doc.get('id') or filename.replace('.json', '')

            # 1. Đồng bộ metadata vào tree.json nếu chưa có
            existing_node = tree['nodes'].get(doc_id, {})
            tree['nodes'][doc_id] = {
                'id': doc_id,
                'type': 'file',
                'title': doc.get('title', existing_node.get('title', 'Untitled')),
                'parent_id': doc.get('parent_id', existing_node.get('parent_id', 'root')),
                'created_at': doc.get('created_at', existing_node.get('created_at')),
                'updated_at': doc.get('updated_at', existing_node.get('updated_at')),
                'created_by': doc.get('created_by', existing_node.get('created_by')),
                'updated_by': doc.get('updated_by', existing_node.get('updated_by'))
            }

            # 2. Trích xuất Base64 ra file ảnh tĩnh
            content = doc.get('content', {})
            ops = content.get('ops', []) if isinstance(content, dict) else []
            doc_modified = False

            for op in ops:
                if isinstance(op.get('insert'), dict) and 'image' in op['insert']:
                    image_val = op['insert']['image']
                    if isinstance(image_val, str) and image_val.startswith('data:image'):
                        try:
                            # Parse header và base64 string
                            header, b64_data = image_val.split(';base64,')
                            ext = header.split('/')[-1].split('+')[0]
                            if ext not in ['png', 'jpeg', 'jpg', 'webp', 'gif', 'svg']:
                                ext = 'webp'

                            img_bytes = base64.b64decode(b64_data)
                            img_filename = f"migrated_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}.{ext}"
                            img_path = os.path.join(uploads_dir, img_filename)

                            with open(img_path, 'wb') as f:
                                f.write(img_bytes)

                            # Thay thế chuỗi Base64 bằng URL tĩnh
                            op['insert']['image'] = f"/api/v1/docupedia/projects/{project_id}/uploads/{img_filename}"
                            doc_modified = True
                            migrated_images_count += 1
                        except Exception as e:
                            print(f"[Migration] Lỗi trích xuất ảnh trong doc {doc_id}: {e}")

            if doc_modified:
                JSONStorage.write(filepath, doc)
                migrated_docs_count += 1

        JSONStorage.write(tree_file, tree)

    # Đánh dấu đã hoàn thành migration
    status_data['v1_base64_and_tree_migration'] = True
    status_data['migrated_at'] = get_timestamp()
    status_data['summary'] = {
        'migrated_images': migrated_images_count,
        'migrated_docs': migrated_docs_count
    }
    JSONStorage.write(status_file, status_data)
    print(f"[Migration] Hoàn tất: Đã chuyển đổi {migrated_images_count} ảnh trong {migrated_docs_count} tài liệu.")
