#!/bin/bash

# ==============================================================================
# Docupedia - Docker Management CLI & Automation Script
# Hỗ trợ: Quản lý Docker Containers, Deep Clean, Shell Access, và Chạy Unit Tests
# ==============================================================================

set -e

CONTAINER_NAME="docupedia_app"
CLEAN_INTERVAL_DAYS=30

# Thư mục lưu vết chu kỳ dọn dẹp 30 ngày
get_record_file() {
    local DEFAULT_DIR="/opt/docupedia_cleanup"
    if [ -w "/opt" ] || [ "$EUID" -eq 0 ]; then
        mkdir -p "$DEFAULT_DIR" 2>/dev/null || true
        echo "$DEFAULT_DIR/last_cleanup.txt"
    else
        local USER_HOME="${HOME:-/tmp}"
        local FALLBACK_DIR="$USER_HOME/.docupedia_cleanup"
        mkdir -p "$FALLBACK_DIR" 2>/dev/null || true
        echo "$FALLBACK_DIR/last_cleanup.txt"
    fi
}

save_record_timestamp() {
    local RECORD_FILE
    RECORD_FILE=$(get_record_file)
    local CURRENT_EPOCH
    CURRENT_EPOCH=$(date +%s)
    local CURRENT_DATE_STR
    CURRENT_DATE_STR=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    echo "$CURRENT_EPOCH" > "$RECORD_FILE" 2>/dev/null || true
    echo "$CURRENT_DATE_STR" >> "$RECORD_FILE" 2>/dev/null || true
}

show_usage() {
    echo "=============================================================================="
    echo "📘 Docupedia Docker Management CLI"
    echo "=============================================================================="
    echo "Usage: $0 [ACTION] [OPTIONS]"
    echo ""
    echo "Actions:"
    echo "  start               Build & Start containers (Auto 30-day cleanup & prune)"
    echo "  stop                Stop containers and clean unused volumes/dangling images"
    echo "  restart             Restart containers without full rebuild"
    echo "  access              Open bash terminal inside the '$CONTAINER_NAME' container"
    echo "  run_unittest        Run Python Unit Tests inside the running container"
    echo "  js_unittest         Run React / JS Unit Tests inside the running container"
    echo "  test_all            Run BOTH JavaScript and Python Unit Tests"
    echo "  clean               Deep clean Docker cache, unused images and volumes"
    echo "  logs                Follow live container logs"
    echo "  help, -h, --help    Show this help message"
    echo ""
    echo "Options:"
    echo "  --no-cache          Force clean rebuild without Docker cache (use with 'start')"
    echo "  --force, -f         Bypass 30-day interval check and execute clean immediately"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Khởi động containers"
    echo "  $0 test_all                 # Chạy toàn bộ kiểm thử React JS & Python"
    echo "  $0 js_unittest              # Chạy riêng unit test React Frontend"
    echo "  $0 run_unittest             # Chạy riêng unit test Python Backend"
    echo "  $0 access                   # Vào terminal bash của container"
    echo "  $0 clean --force            # Dọn dẹp triệt để Docker giải phóng dung lượng"
    echo "=============================================================================="
}

check_container_running() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Lỗi: Docker daemon chưa được khởi chạy hoặc không có quyền truy cập."
        exit 1
    fi

    if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo "❌ Lỗi: Container '$CONTAINER_NAME' hiện không hoạt động."
        echo "👉 Vui lòng khởi động container trước bằng lệnh: $0 start"
        exit 1
    fi
}

auto_cleanup() {
    echo "--> [Auto-Clean] Dọn dẹp dangling images & volumes thừa..."
    docker image prune -f > /dev/null 2>&1 || true
    docker volume prune -f > /dev/null 2>&1 || true
}

perform_docker_clean() {
    echo "=============================================================================="
    echo "--> 🧹 Bắt đầu quy trình dọn dẹp Docker chuyên sâu (Deep Cleanup)..."
    echo "=============================================================================="

    local ALL_CONTAINERS
    ALL_CONTAINERS=$(docker ps -a -q)
    if [ -n "$ALL_CONTAINERS" ]; then
        echo "--> [1/5] Dừng tất cả containers..."
        docker stop $ALL_CONTAINERS 2>/dev/null || true

        echo "--> [2/5] Xóa các containers đã dừng..."
        docker rm -f $ALL_CONTAINERS 2>/dev/null || true
    else
        echo "--> [1/5 & 2/5] Không có container nào cần xóa."
    fi

    echo "--> [3/5] Xóa tất cả unused images để giải phóng ổ đĩa..."
    docker image prune -a -f

    echo "--> [4/5] Dọn dẹp builder cache và volumes không dùng..."
    docker volume prune -f > /dev/null 2>&1 || true
    docker builder prune -a -f > /dev/null 2>&1 || docker builder prune -f > /dev/null 2>&1 || true

    echo "--> [5/5] Thu hồi toàn bộ không gian Docker system..."
    docker system prune -a --volumes -f

    save_record_timestamp

    echo "=============================================================================="
    echo "✅ Dọn dẹp Docker hoàn tất thành công!"
    echo "🕒 Lần dọn dẹp tự động tiếp theo sau $CLEAN_INTERVAL_DAYS ngày."
    echo "=============================================================================="
}

check_and_run_clean() {
    local MODE="${1:-manual}"
    local CURRENT_EPOCH
    CURRENT_EPOCH=$(date +%s)
    local RECORD_FILE
    RECORD_FILE=$(get_record_file)

    if [ "$FORCE_CLEAN" = "true" ]; then
        echo "--> Chế độ Force Clean (--force / -f) được kích hoạt."
        perform_docker_clean
        return 0
    fi

    if [ -f "$RECORD_FILE" ] && [ -s "$RECORD_FILE" ]; then
        local LAST_EPOCH
        LAST_EPOCH=$(head -n 1 "$RECORD_FILE" | tr -d ' \r\n')
        local LAST_DATE_STR
        LAST_DATE_STR=$(sed -n '2p' "$RECORD_FILE" | tr -d '\r\n')

        if [[ "$LAST_EPOCH" =~ ^[0-9]+$ ]]; then
            local ELAPSED_SECONDS=$(( CURRENT_EPOCH - LAST_EPOCH ))
            local ELAPSED_DAYS=$(( ELAPSED_SECONDS / 86400 ))
            local REMAINING_DAYS=$(( CLEAN_INTERVAL_DAYS - ELAPSED_DAYS ))

            if [ "$ELAPSED_DAYS" -lt "$CLEAN_INTERVAL_DAYS" ]; then
                echo "--> [30-Day Check] Lần deep clean gần nhất: ${LAST_DATE_STR:-$LAST_EPOCH} ($ELAPSED_DAYS ngày trước)."
                echo "--> [30-Day Check] Lần dọn dẹp tự động tiếp theo sau $REMAINING_DAYS ngày."
                if [ "$MODE" = "manual" ]; then
                    echo "👉 Để dọn dẹp ngay lập tức, chạy: $0 clean --force (hoặc -f)"
                fi
                return 0
            else
                echo "--> [30-Day Check] Đã qua $ELAPSED_DAYS ngày. Tiến hành dọn dẹp theo chu kỳ..."
                perform_docker_clean
                return 0
            fi
        fi
    fi

    if [ "$MODE" = "auto_start" ]; then
        echo "--> [30-Day Check] Khởi tạo bộ đếm chu kỳ dọn dẹp 30 ngày..."
        save_record_timestamp
    else
        echo "--> Chưa có lịch sử dọn dẹp. Tiến hành dọn dẹp lần đầu..."
        perform_docker_clean
    fi
}

# Phân tích arguments
ACTION=""
BUILD_CACHE="true"
FORCE_CLEAN="false"

for arg in "$@"; do
    case "$arg" in
        --no-cache)
            BUILD_CACHE="false"
            ;;
        --force|-f)
            FORCE_CLEAN="true"
            ;;
        start|stop|restart|clean|access|run_unittest|js_unittest|test_all|logs|help|--help|-h)
            ACTION="$arg"
            ;;
    esac
done

if [ -z "$ACTION" ]; then
    if [ "$BUILD_CACHE" = "false" ]; then
        ACTION="start"
    else
        ACTION="help"
    fi
fi

case "$ACTION" in
    start)
        echo "--> Kiểm tra trạng thái chu kỳ dọn dẹp 30 ngày..."
        check_and_run_clean "auto_start"

        echo "--> Dừng containers cũ..."
        docker compose down 2>/dev/null || true
        mkdir -p data

        if [ "$BUILD_CACHE" = "false" ]; then
            echo "🔨 Building images với --no-cache..."
            docker compose build --no-cache --build-arg CACHEBUST=$(date +%s)
        else
            echo "🔨 Building images (sử dụng cache)..."
            docker compose build --build-arg CACHEBUST=$(date +%s)
        fi

        auto_cleanup

        echo "🚀 Khởi động containers..."
        docker compose up -d
        
        echo "⏳ Đợi container khởi động..."
        sleep 3
        
        echo "📦 Sao chép dist/index.html từ container sang host..."
        docker cp docupedia_app:/app/dist/index.html ./data/index.html 2>/dev/null || true
        
        if docker compose ps | grep -q "Up"; then
            echo "=============================================================================="
            echo "✅ Docupedia đã khởi động thành công!"
            echo "=============================================================================="
            echo "🌐 URL: http://localhost:5000"
            echo "👤 Login: admin / admin"
            echo ""
            echo "📋 Xem logs:       $0 logs"
            echo "🧪 Chạy Unit Test: $0 run_unittest"
            echo "🛑 Dừng container: $0 stop"
            echo "=============================================================================="
        else
            echo "❌ Lỗi khởi động container!"
            docker compose logs
            exit 1
        fi
        ;;
    stop)
        echo "🛑 Dừng containers..."
        docker compose down
        auto_cleanup
        echo "✅ Containers đã dừng và artifacts thừa đã được dọn sạch."
        ;;
    restart)
        echo "🔄 Khởi động lại containers..."
        docker compose down
        docker compose up -d
        echo "✅ Containers đã được khởi động lại."
        ;;
    clean)
        check_and_run_clean "manual"
        ;;
    access)
        check_container_running
        echo "💻 Đang kết nối vào container ($CONTAINER_NAME)..."
        docker exec -it "$CONTAINER_NAME" bash
        ;;
    run_unittest)
        check_container_running
        echo "=============================================================================="
        echo "🧪 Đang thực thi Python Unit Test Suite bên trong container ($CONTAINER_NAME)..."
        echo "=============================================================================="
        docker exec -it "$CONTAINER_NAME" env PYTHONPATH=src python -m unittest discover -s src/unit_tests -p "test_*.py"
        ;;
    js_unittest)
        check_container_running
        echo "=============================================================================="
        echo "🧪 Đang thực thi React / JS Unit Test Suite bên trong container ($CONTAINER_NAME)..."
        echo "=============================================================================="
        docker exec -it "$CONTAINER_NAME" node --test src-react/unittest/*.test.js
        ;;
    test_all)
        check_container_running
        echo "=============================================================================="
        echo "--> 1. Chạy React / JavaScript Unit Tests..."
        echo "=============================================================================="
        docker exec -it "$CONTAINER_NAME" node --test src-react/unittest/*.test.js
        echo ""
        echo "=============================================================================="
        echo "--> 2. Chạy Python Backend Unit Tests..."
        echo "=============================================================================="
        docker exec -it "$CONTAINER_NAME" env PYTHONPATH=src python -m unittest discover -s src/unit_tests -p "test_*.py"
        ;;
    logs)
        check_container_running
        docker compose logs -f
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "❌ Lỗi: Lệnh không hợp lệ '$ACTION'"
        show_usage
        exit 1
        ;;
esac