#!/bin/bash

# Docupedia - Start Script
# Khởi động Docker container với Flask backend + React frontend

set -e

echo "===================================================="
echo "🚀 Starting Docupedia..."
echo "===================================================="

# Tạo thư mục data nếu chưa có
mkdir -p data

# Dừng containers cũ nếu có
docker compose down 2>/dev/null || true

# Build với CACHEBUST để invalidate cache (dùng timestamp)
echo "🔨 Building with cache bust..."
docker compose build --build-arg CACHEBUST=$(date +%s)

# Chạy container
docker compose up -d

# Đợi container khởi động
sleep 3

# Kiểm tra trạng thái
if docker compose ps | grep -q "Up"; then
    echo "===================================================="
    echo "✅ Docupedia đã khởi động thành công!"
    echo "===================================================="
    echo ""
    echo "🌐 URL: http://localhost:5000"
    echo "👤 Login: admin / admin"
    echo ""
    echo "📋 Xem logs: docker compose logs -f"
    echo "🛑 Dừng:     docker compose down"
    echo "===================================================="
else
    echo "❌ Lỗi khởi động container!"
    docker compose logs
    exit 1
fi

docker cp docupedia_app:/app/dist/index.html ./data/index.html