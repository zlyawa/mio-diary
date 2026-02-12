#!/bin/bash

############################################
# Mio Diary - 统一管理脚本
# 描述: 安装、启动、停止、查看状态和日志
# 作者: zly
# 版本: v1.3.0
############################################

set -e

# 脚本参数
PROJECT_NAME="Mio Diary"
BACKEND_PORT=3001
FRONTEND_PORT=5173
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 图标
INFO="ℹ"
SUCCESS="✓"
ERROR="✗"
WARN="⚠"
ARROW="➤"

############################################
# 日志函数
############################################

log_info() {
    echo -e "${CYAN}${INFO}${NC} $1"
}

log_success() {
    echo -e "${GREEN}${SUCCESS}${NC} $1"
}

log_error() {
    echo -e "${RED}${ERROR}${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${WARN}${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}${ARROW}${NC} $1"
}

############################################
# 打印头部信息
############################################

print_header() {
    cat << "EOF"

╔═══════════════════════════════════════╗
║                                       ║
║         Mio's Diary - 日记本          ║
║        统一管理脚本 v1.3.0            ║
║                                       ║
╚═══════════════════════════════════════╝

EOF
}

############################################
# 检查命令是否存在
############################################

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

############################################
# 检查端口是否被占用
############################################

check_port() {
    local port=$1
    if command_exists lsof; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 1
        fi
    elif command_exists netstat; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1
        fi
    fi
    return 0
}

############################################
# 生成随机密钥
############################################

generate_secret_key() {
    if command_exists openssl; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
    fi
}

############################################
# 检查服务状态
############################################

check_service_status() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

############################################
# 显示状态
############################################

show_status() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}           服务状态                    ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
    
    local backend_status="${RED}停止${NC}"
    local frontend_status="${RED}停止${NC}"
    local backend_pid=""
    local frontend_pid=""
    
    if check_service_status "$LOGS_DIR/backend.pid"; then
        backend_status="${GREEN}运行中${NC}"
        backend_pid=$(cat "$LOGS_DIR/backend.pid")
    fi
    
    if check_service_status "$LOGS_DIR/frontend.pid"; then
        frontend_status="${GREEN}运行中${NC}"
        frontend_pid=$(cat "$LOGS_DIR/frontend.pid")
    fi
    
    echo -e "后端服务: $backend_status"
    [ -n "$backend_pid" ] && echo -e "  PID: $backend_pid"
    echo -e "前端服务: $frontend_status"
    [ -n "$frontend_pid" ] && echo -e "  PID: $frontend_pid"
    
    echo ""
    echo -e "${CYAN}访问地址:${NC}"
    echo -e "  前端: http://localhost:$FRONTEND_PORT"
    echo -e "  后端: http://localhost:$BACKEND_PORT"
    
    echo ""
    echo -e "${CYAN}日志文件:${NC}"
    echo -e "  后端: $LOGS_DIR/backend.log"
    echo -e "  前端: $LOGS_DIR/frontend.log"
    
    echo ""
}

############################################
# 安装依赖
############################################

install_deps() {
    log_step "正在安装依赖..."
    
    # 检查环境
    if ! command_exists node; then
        log_error "未检测到 Node.js，请先安装 Node.js 18+"
        exit 1
    fi
    
    local NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18.x 或更高版本"
        exit 1
    fi
    
    log_info "Node.js 版本: $(node -v)"
    
    # 安装后端依赖
    log_step "安装后端依赖..."
    cd "$SCRIPT_DIR/backend"
    
    if [ -d "node_modules" ]; then
        log_info "清理旧的 node_modules..."
        rm -rf node_modules
    fi
    
    npm install
    
    # 生成 JWT 密钥
    if [ ! -f ".env" ]; then
        log_info "生成配置文件..."
        local JWT_SECRET=$(generate_secret_key)
        local JWT_REFRESH_SECRET=$(generate_secret_key)
        
        cat > .env << EOF
DATABASE_URL="file:./dev.db"
PORT=$BACKEND_PORT
HOST=localhost
NODE_ENV=development
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
EOF
        log_success "后端 .env 已创建"
    fi
    
    # 初始化数据库
    log_info "初始化数据库..."
    npx prisma generate 2>/dev/null || true
    npx prisma migrate dev --name init --skip-generate 2>/dev/null || true
    
    cd "$SCRIPT_DIR"
    
    # 安装前端依赖
    log_step "安装前端依赖..."
    cd "$SCRIPT_DIR/frontend"
    
    if [ -d "node_modules" ]; then
        log_info "清理旧的 node_modules..."
        rm -rf node_modules
    fi
    
    npm install --legacy-peer-deps
    
    if [ ! -f ".env" ]; then
        echo "VITE_API_URL=http://localhost:$BACKEND_PORT/api" > .env
        log_success "前端 .env 已创建"
    fi
    
    cd "$SCRIPT_DIR"
    log_success "依赖安装完成"
}

############################################
# 启动服务
############################################

start_services() {
    log_step "正在启动服务..."
    
    mkdir -p "$LOGS_DIR"
    
    # 检查是否已在运行
    if check_service_status "$LOGS_DIR/backend.pid"; then
        log_warn "后端服务已在运行 (PID: $(cat $LOGS_DIR/backend.pid))"
    else
        log_info "启动后端服务..."
        cd "$SCRIPT_DIR/backend"
        nohup npm start > "$LOGS_DIR/backend.log" 2>&1 &
        echo $! > "$LOGS_DIR/backend.pid"
        log_success "后端服务已启动"
    fi
    
    if check_service_status "$LOGS_DIR/frontend.pid"; then
        log_warn "前端服务已在运行 (PID: $(cat $LOGS_DIR/frontend.pid))"
    else
        log_info "启动前端服务..."
        cd "$SCRIPT_DIR/frontend"
        nohup npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
        echo $! > "$LOGS_DIR/frontend.pid"
        log_success "前端服务已启动"
    fi
    
    sleep 3
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  服务已启动！                         ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "📝 前端地址: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "🔧 后端地址: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo ""
}

############################################
# 启动并显示日志
############################################

start_with_logs() {
    start_services
    show_logs
}

############################################
# 停止服务
############################################

stop_services() {
    log_step "正在停止服务..."
    
    local stopped=false
    
    if [ -f "$LOGS_DIR/backend.pid" ]; then
        local pid=$(cat "$LOGS_DIR/backend.pid")
        if kill -0 $pid 2>/dev/null; then
            log_info "停止后端服务 (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            stopped=true
        fi
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    if [ -f "$LOGS_DIR/frontend.pid" ]; then
        local pid=$(cat "$LOGS_DIR/frontend.pid")
        if kill -0 $pid 2>/dev/null; then
            log_info "停止前端服务 (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            stopped=true
        fi
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    # 清理残留进程
    pkill -f "node.*backend" 2>/dev/null || true
    pkill -f "vite.*frontend" 2>/dev/null || true
    
    if [ "$stopped" = true ]; then
        log_success "服务已停止"
    else
        log_warn "没有运行中的服务"
    fi
}

############################################
# 查看日志
############################################

show_logs() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}         实时日志输出                  ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 退出日志查看${NC}"
    echo ""
    
    # 创建日志文件（如果不存在）
    touch "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log"
    
    # 使用 tail 同时显示两个日志文件
    tail -f "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log" 2>/dev/null &
    local TAIL_PID=$!
    
    # 捕获 Ctrl+C 信号
    trap 'kill $TAIL_PID 2>/dev/null; echo -e "\n${GREEN}已退出日志查看${NC}"; exit 0' INT
    
    # 等待 tail 进程
    wait $TAIL_PID
}

############################################
# 查看后端日志
############################################

show_backend_logs() {
    if [ -f "$LOGS_DIR/backend.log" ]; then
        echo -e "${BLUE}后端日志:${NC}"
        tail -n 50 "$LOGS_DIR/backend.log"
    else
        log_warn "后端日志文件不存在"
    fi
}

############################################
# 查看前端日志
############################################

show_frontend_logs() {
    if [ -f "$LOGS_DIR/frontend.log" ]; then
        echo -e "${BLUE}前端日志:${NC}"
        tail -n 50 "$LOGS_DIR/frontend.log"
    else
        log_warn "前端日志文件不存在"
    fi
}

############################################
# 重启服务
############################################

restart_services() {
    log_step "正在重启服务..."
    stop_services
    sleep 2
    start_services
}

############################################
# 显示菜单
############################################

show_menu() {
    print_header
    show_status
    
    echo -e "${MAGENTA}请选择操作:${NC}"
    echo ""
    echo "  1) 安装依赖"
    echo "  2) 启动服务"
    echo "  3) 启动服务并显示日志"
    echo "  4) 停止服务"
    echo "  5) 重启服务"
    echo "  6) 查看实时日志"
    echo "  7) 查看后端日志 (最近50行)"
    echo "  8) 查看前端日志 (最近50行)"
    echo "  9) 刷新状态"
    echo "  0) 退出"
    echo ""
    echo -n "请输入选项 [0-9]: "
}

############################################
# 主菜单循环
############################################

main_menu() {
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                install_deps
                read -p "按回车键继续..."
                ;;
            2)
                start_services
                read -p "按回车键继续..."
                ;;
            3)
                start_with_logs
                ;;
            4)
                stop_services
                read -p "按回车键继续..."
                ;;
            5)
                restart_services
                read -p "按回车键继续..."
                ;;
            6)
                show_logs
                ;;
            7)
                show_backend_logs
                read -p "按回车键继续..."
                ;;
            8)
                show_frontend_logs
                read -p "按回车键继续..."
                ;;
            9)
                continue
                ;;
            0)
                echo ""
                log_info "再见！"
                exit 0
                ;;
            *)
                log_warn "无效选项，请重新选择"
                sleep 1
                ;;
        esac
    done
}

############################################
# 命令行参数处理
############################################

usage() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  install     安装依赖"
    echo "  start       启动服务"
    echo "  start-log   启动服务并显示日志"
    echo "  stop        停止服务"
    echo "  restart     重启服务"
    echo "  status      查看状态"
    echo "  log         查看实时日志"
    echo "  log-backend 查看后端日志"
    echo "  log-frontend 查看前端日志"
    echo "  menu        显示交互式菜单（默认）"
    echo "  help        显示帮助"
    echo ""
}

# 处理命令行参数
case "${1:-menu}" in
    install)
        install_deps
        ;;
    start)
        start_services
        ;;
    start-log)
        start_with_logs
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        print_header
        show_status
        ;;
    log)
        show_logs
        ;;
    log-backend)
        show_backend_logs
        ;;
    log-frontend)
        show_frontend_logs
        ;;
    menu|"")
        main_menu
        ;;
    help|-h|--help)
        usage
        ;;
    *)
        log_error "未知命令: $1"
        usage
        exit 1
        ;;
esac
