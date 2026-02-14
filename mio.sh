#!/bin/bash

#############################################
# Mio Diary - 统一管理脚本
# 版本: v2.0.0
# GitHub: https://github.com/zlyawa/mio-diary
#############################################

set -e

# ==================== 配置 ====================
PROJECT_VERSION="2.0.2"
BACKEND_PORT=3001
FRONTEND_PORT=5173
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

# ==================== 颜色和图标 ====================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'
INFO="ℹ"; SUCCESS="✓"; ERROR="✗"; WARN="⚠"; ARROW="➤"

# ==================== 工具函数 ====================
log_info() { echo -e "${CYAN}${INFO}${NC} $1"; }
log_success() { echo -e "${GREEN}${SUCCESS}${NC} $1"; }
log_error() { echo -e "${RED}${ERROR}${NC} $1"; }
log_warn() { echo -e "${YELLOW}${WARN}${NC} $1"; }
log_step() { echo -e "\n${BLUE}${ARROW}${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

check_port() {
    local port=$1
    if command_exists lsof && lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    elif command_exists netstat && netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 1
    fi
    return 0
}

generate_secret_key() {
    if command_exists openssl; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
    fi
}

check_service_status() {
    local pid_file=$1
    local port=$2
    # 使用 curl 检测服务是否响应
    if command_exists curl && curl -s --connect-timeout 2 "http://localhost:$port" >/dev/null 2>&1; then
        return 0
    fi
    # 服务不响应，清理无效的 PID 文件
    [ -f "$pid_file" ] && rm -f "$pid_file"
    return 1
}

# ==================== 头部和状态显示 ====================
print_header() {
    echo -e "\n${MAGENTA}╔═══════════════════════════════════════════╗${NC}
${MAGENTA}║${NC}      📖 Mio's Diary - 日记本 v${PROJECT_VERSION}        ${MAGENTA}║${NC}
${MAGENTA}║${NC}   https://github.com/zlyawa/mio-diary    ${MAGENTA}║${NC}
${MAGENTA}╚═══════════════════════════════════════════╝${NC}\n"
}

show_status() {
    local backend_status="${RED}● 停止${NC}" frontend_status="${RED}● 停止${NC}"
    local backend_pid="" frontend_pid=""
    
    if check_service_status "$LOGS_DIR/backend.pid" $BACKEND_PORT; then
        backend_status="${GREEN}● 运行中${NC}"
        [ -f "$LOGS_DIR/backend.pid" ] && backend_pid=$(cat "$LOGS_DIR/backend.pid")
    fi
    if check_service_status "$LOGS_DIR/frontend.pid" $FRONTEND_PORT; then
        frontend_status="${GREEN}● 运行中${NC}"
        [ -f "$LOGS_DIR/frontend.pid" ] && frontend_pid=$(cat "$LOGS_DIR/frontend.pid")
    fi
    
    echo -e "${BLUE}【服务状态】${NC}"
    echo -e "  后端: $backend_status ${backend_pid:+(PID: $backend_pid)}"
    echo -e "  前端: $frontend_status ${frontend_pid:+(PID: $frontend_pid)}"
    echo -e "\n${BLUE}【访问地址】${NC}"
    echo -e "  前端: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  后端: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  管理: ${CYAN}http://localhost:$FRONTEND_PORT/admin${NC}\n"
}

show_version() {
    echo -e "\n${BLUE}【版本信息】${NC}"
    echo -e "  项目版本: v${PROJECT_VERSION}"
    [ -f "$SCRIPT_DIR/backend/package.json" ] && \
        echo -e "  后端版本: v$(grep '"version"' "$SCRIPT_DIR/backend/package.json" | head -1 | cut -d'"' -f4)"
    [ -f "$SCRIPT_DIR/frontend/package.json" ] && \
        echo -e "  前端版本: v$(grep '"version"' "$SCRIPT_DIR/frontend/package.json" | head -1 | cut -d'"' -f4)"
    echo -e "  Node.js: $(node -v 2>/dev/null || echo '未安装')"
    echo -e "  npm: $(npm -v 2>/dev/null || echo '未安装')"
    [ -f "$SCRIPT_DIR/backend/prisma/dev.db" ] && \
        echo -e "  数据库: SQLite ($(du -h "$SCRIPT_DIR/backend/prisma/dev.db" 2>/dev/null | cut -f1))\n"
}

# ==================== 安装依赖 ====================
install_deps() {
    log_step "📦 安装依赖..."
    
    if ! command_exists node; then
        log_error "未检测到 Node.js，请先安装 Node.js 18+"; exit 1
    fi
    
    local NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    [ "$NODE_VERSION" -lt 18 ] && { log_error "Node.js 版本过低，需要 18+"; exit 1; }
    
    log_info "Node.js: $(node -v) | npm: $(npm -v)"
    
    # 后端
    log_step "安装后端依赖..."
    cd "$SCRIPT_DIR/backend"
    [ -d "node_modules" ] && { log_info "清理旧依赖..."; rm -rf node_modules; }
    npm install
    
    [ ! -f ".env" ] && {
        log_info "生成配置文件..."
        cat > .env << EOF
DATABASE_URL="file:./dev.db"
PORT=$BACKEND_PORT
HOST=localhost
NODE_ENV=development
JWT_SECRET=$(generate_secret_key)
JWT_REFRESH_SECRET=$(generate_secret_key)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
EOF
        log_success "后端 .env 已创建"
    }
    
    log_step "🗄️ 初始化数据库..."
    npx prisma generate 2>/dev/null || true
    [ ! -f "prisma/dev.db" ] && { npx prisma migrate dev --name init --skip-generate 2>/dev/null || true; log_success "数据库初始化完成"; }
    
    # 前端
    log_step "安装前端依赖..."
    cd "$SCRIPT_DIR/frontend"
    [ -d "node_modules" ] && { log_info "清理旧依赖..."; rm -rf node_modules; }
    npm install --legacy-peer-deps
    
    [ ! -f ".env" ] && { echo "VITE_API_URL=http://localhost:$BACKEND_PORT/api" > .env; log_success "前端 .env 已创建"; }
    
    cd "$SCRIPT_DIR"
    log_success "依赖安装完成！"
}

# ==================== 启动服务 ====================
start_services() {
    log_step "🚀 启动服务..."
    mkdir -p "$LOGS_DIR"
    
    # 检查端口
    if ! check_port $BACKEND_PORT; then
        log_error "端口 $BACKEND_PORT 已被占用"; exit 1
    fi
    if ! check_port $FRONTEND_PORT; then
        log_error "端口 $FRONTEND_PORT 已被占用"; exit 1
    fi
    
    # 检查依赖
    [ ! -d "$SCRIPT_DIR/backend/node_modules" ] && { log_error "后端依赖未安装，请先运行: $0 install"; exit 1; }
    [ ! -d "$SCRIPT_DIR/frontend/node_modules" ] && { log_error "前端依赖未安装，请先运行: $0 install"; exit 1; }
    
    # 检查数据库
    [ ! -f "$SCRIPT_DIR/backend/prisma/dev.db" ] && {
        log_warn "数据库未初始化..."
        cd "$SCRIPT_DIR/backend" && npx prisma migrate dev --name init --skip-generate 2>/dev/null || true
        cd "$SCRIPT_DIR"
    }
    
    # 启动后端
    if check_service_status "$LOGS_DIR/backend.pid" $BACKEND_PORT; then
        [ -f "$LOGS_DIR/backend.pid" ] && log_warn "后端已在运行 (PID: $(cat $LOGS_DIR/backend.pid))" || log_warn "后端已在运行"
    else
        log_info "启动后端..."
        cd "$SCRIPT_DIR/backend"
        npm start > "$LOGS_DIR/backend.log" 2>&1 &
        echo $! > "$LOGS_DIR/backend.pid"
        disown
        cd "$SCRIPT_DIR"
        log_success "后端已启动"
    fi
    
    # 启动前端
    if check_service_status "$LOGS_DIR/frontend.pid" $FRONTEND_PORT; then
        [ -f "$LOGS_DIR/frontend.pid" ] && log_warn "前端已在运行 (PID: $(cat $LOGS_DIR/frontend.pid))" || log_warn "前端已在运行"
    else
        log_info "启动前端..."
        cd "$SCRIPT_DIR/frontend"
        npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
        echo $! > "$LOGS_DIR/frontend.pid"
        disown
        cd "$SCRIPT_DIR"
        log_success "前端已启动"
    fi
    
    # 健康检查
    sleep 3
    log_info "检查服务状态..."
    local backend_ok=false frontend_ok=false
    
    for i in {1..10}; do
        command_exists curl && curl -s "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1 && { backend_ok=true; break; }
        sleep 1
    done
    for i in {1..10}; do
        command_exists curl && curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 && { frontend_ok=true; break; }
        sleep 1
    done
    
    echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  🚀 服务已启动！${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    [ "$backend_ok" = true ] && echo -e "${GREEN}✓${NC} 后端: ${CYAN}http://localhost:$BACKEND_PORT${NC}" || echo -e "${YELLOW}⚠${NC} 后端启动中..."
    [ "$frontend_ok" = true ] && echo -e "${GREEN}✓${NC} 前端: ${CYAN}http://localhost:$FRONTEND_PORT${NC}" || echo -e "${YELLOW}⚠${NC} 前端启动中..."
    echo -e "\n${CYAN}提示: '$0 log' 查看实时日志${NC}\n"
}

start_with_logs() {
    start_services
    show_logs
}

# ==================== 停止服务 ====================
stop_services() {
    log_step "停止服务..."
    local stopped=false
    
    # 停止后端 - 通过端口和进程名双重检测
    if command_exists curl && curl -s --connect-timeout 2 "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
        # 服务还在运行，尝试通过 PID 文件停止
        if [ -f "$LOGS_DIR/backend.pid" ]; then
            local pid=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
                # 等待进程退出
                local count=0
                while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                    sleep 0.5
                    count=$((count + 1))
                done
            fi
            rm -f "$LOGS_DIR/backend.pid"
        fi
        # 备用：通过进程名停止
        pkill -f "node.*server.js" 2>/dev/null || true
        log_info "后端已停止"
        stopped=true
    elif [ -f "$LOGS_DIR/backend.pid" ]; then
        # PID 文件存在但服务不响应，清理 PID 文件
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    # 停止前端 - 通过端口检测
    if command_exists curl && curl -s --connect-timeout 2 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        # 服务还在运行
        if [ -f "$LOGS_DIR/frontend.pid" ]; then
            local pid=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
                # 等待进程退出
                local count=0
                while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                    sleep 0.5
                    count=$((count + 1))
                done
            fi
            rm -f "$LOGS_DIR/frontend.pid"
        fi
        # 备用：通过进程名停止
        pkill -f "vite" 2>/dev/null || true
        log_info "前端已停止"
        stopped=true
    elif [ -f "$LOGS_DIR/frontend.pid" ]; then
        # PID 文件存在但服务不响应，清理 PID 文件
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    [ "$stopped" = true ] && log_success "服务已停止" || log_warn "没有运行中的服务"
}

restart_services() {
    log_step "重启服务..."
    stop_services
    sleep 2
    start_services
}

# ==================== 日志查看 ====================
show_logs() {
    echo -e "\n${BLUE}【实时日志】${NC} 按 Ctrl+C 退出\n"
    touch "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log"
    tail -f "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log" 2>/dev/null &
    trap 'kill $! 2>/dev/null; echo -e "\n${GREEN}已退出日志查看${NC}"; exit 0' INT
    wait
}

show_backend_logs() {
    [ -f "$LOGS_DIR/backend.log" ] && { echo -e "${BLUE}后端日志 (最近50行):${NC}"; tail -n 50 "$LOGS_DIR/backend.log"; } || log_warn "日志文件不存在"
}

show_frontend_logs() {
    [ -f "$LOGS_DIR/frontend.log" ] && { echo -e "${BLUE}前端日志 (最近50行):${NC}"; tail -n 50 "$LOGS_DIR/frontend.log"; } || log_warn "日志文件不存在"
}

# ==================== 数据库管理 ====================
db_studio() {
    log_info "启动 Prisma Studio..."
    cd "$SCRIPT_DIR/backend" && npx prisma studio
}

db_migrate() {
    log_info "运行数据库迁移..."
    cd "$SCRIPT_DIR/backend" && npx prisma migrate dev
}

db_reset() {
    log_warn "⚠️ 这将删除所有数据！"
    read -p "确定重置数据库？(y/N): " confirm
    [ "$confirm" = "y" ] || [ "$confirm" = "Y" ] && { cd "$SCRIPT_DIR/backend" && npx prisma migrate reset --force && log_success "数据库已重置"; } || log_info "已取消"
}

db_backup() {
    local backup_dir="$SCRIPT_DIR/backups"
    local backup_file="$backup_dir/dev_db_$(date +%Y%m%d_%H%M%S).db"
    mkdir -p "$backup_dir"
    [ -f "$SCRIPT_DIR/backend/prisma/dev.db" ] && { cp "$SCRIPT_DIR/backend/prisma/dev.db" "$backup_file"; log_success "已备份: $backup_file"; } || log_error "数据库不存在"
}

# ==================== 构建和清理 ====================
build_production() {
    log_step "⚙️ 构建生产版本..."
    [ ! -d "$SCRIPT_DIR/frontend/node_modules" ] && { log_error "依赖未安装，请先运行: $0 install"; exit 1; }
    cd "$SCRIPT_DIR/frontend" && npm run build
    [ -d "dist" ] && log_success "构建完成: dist/ ($(du -sh dist | cut -f1))" || { log_error "构建失败"; exit 1; }
    echo -e "\n${CYAN}部署提示: 静态文件在 frontend/dist/，设置 NODE_ENV=production${NC}\n"
}

clean() {
    log_step "清理项目..."
    rm -rf "$SCRIPT_DIR/backend/node_modules" "$SCRIPT_DIR/frontend/node_modules" "$SCRIPT_DIR/node_modules"
    rm -rf "$SCRIPT_DIR/frontend/dist"
    rm -f "$LOGS_DIR"/*.log "$LOGS_DIR"/*.pid
    log_success "清理完成"
}

# ==================== 菜单 ====================
show_menu() {
    print_header
    show_status
    echo -e "${MAGENTA}【操作菜单】${NC}
  ${CYAN}基础:${NC} 1)安装 2)启动 3)启动+日志 4)停止 5)重启
  ${CYAN}日志:${NC} 6)实时日志 7)后端日志 8)前端日志
  ${CYAN}数据库:${NC} 9)Studio 10)迁移 11)重置 12)备份
  ${CYAN}其他:${NC} 13)构建 14)清理 15)版本 16)刷新
  0)退出
"
    echo -n "请选择 [0-16]: "
}

main_menu() {
    while true; do
        show_menu; read -r choice
        case $choice in
            1) install_deps; read -p "按回车继续...";;
            2) start_services; read -p "按回车继续...";;
            3) start_with_logs;;
            4) stop_services; read -p "按回车继续...";;
            5) restart_services; read -p "按回车继续...";;
            6) show_logs;;
            7) show_backend_logs; read -p "按回车继续...";;
            8) show_frontend_logs; read -p "按回车继续...";;
            9) db_studio; read -p "按回车继续...";;
            10) db_migrate; read -p "按回车继续...";;
            11) db_reset; read -p "按回车继续...";;
            12) db_backup; read -p "按回车继续...";;
            13) build_production; read -p "按回车继续...";;
            14) clean; read -p "按回车继续...";;
            15) show_version; read -p "按回车继续...";;
            16) continue;;
            0) log_info "再见！"; exit 0;;
            *) log_warn "无效选项"; sleep 1;;
        esac
    done
}

# ==================== 帮助和命令处理 ====================
usage() {
    cat << EOF
${CYAN}Mio Diary v${PROJECT_VERSION} - 管理脚本${NC}

用法: $0 [命令]

${CYAN}基础命令:${NC}
  install    安装依赖      start       启动服务      stop      停止服务
  restart    重启服务      status      查看状态      version   版本信息

${CYAN}日志命令:${NC}
  log        实时日志      log-backend 后端日志      log-frontend 前端日志

${CYAN}数据库命令:${NC}
  db-studio  Prisma Studio db-migrate  数据库迁移    db-reset  重置数据库
  db-backup  备份数据库

${CYAN}其他:${NC}
  build      构建生产版本  clean       清理项目      help      显示帮助

${CYAN}示例:${NC} $0 start  # 启动服务
         $0 log    # 查看日志

${CYAN}GitHub:${NC} https://github.com/zlyawa/mio-diary
EOF
}

case "${1:-menu}" in
    install) install_deps;;
    start) start_services;;
    start-log) start_with_logs;;
    stop) stop_services;;
    restart) restart_services;;
    status) print_header; show_status;;
    version|-v|--version) print_header; show_version;;
    log) show_logs;;
    log-backend) show_backend_logs;;
    log-frontend) show_frontend_logs;;
    db-studio) db_studio;;
    db-migrate) db_migrate;;
    db-reset) db_reset;;
    db-backup) db_backup;;
    build) build_production;;
    clean) clean;;
    menu|"") main_menu;;
    help|-h|--help) usage;;
    *) log_error "未知命令: $1"; usage; exit 1;;
esac
