#!/bin/bash

#############################################
# Mio Diary - 统一管理脚本
# 版本: v2.1.0
# GitHub: https://github.com/zlyawa/mio-diary
#############################################

set -e

# ==================== 配置 ====================
PROJECT_VERSION="2.1.0"
BACKEND_PORT=3001
REDIS_PORT=6379
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

# ==================== Redis 管理 ====================
check_redis_status() {
    if pgrep -x "redis-server" > /dev/null 2>&1; then
        return 0
    fi
    if command_exists redis-cli && redis-cli -p $REDIS_PORT ping 2>/dev/null | grep -q "PONG"; then
        return 0
    fi
    return 1
}

start_redis() {
    if check_redis_status; then
        log_warn "Redis 已在运行"
        return 0
    fi
    
    if ! command_exists redis-server; then
        log_error "Redis 未安装，请先安装: $0 install-redis"
        return 1
    fi
    
    log_step "启动 Redis..."
    
    # 无密码启动
    redis-server --daemonize yes \
        --port $REDIS_PORT \
        --logfile "$LOGS_DIR/redis.log"
    
    sleep 1
    
    if check_redis_status; then
        log_success "Redis 已启动 (端口: $REDIS_PORT)"
        return 0
    else
        log_error "Redis 启动失败"
        return 1
    fi
}

stop_redis() {
    if ! check_redis_status; then
        log_warn "Redis 未运行"
        return 0
    fi
    
    log_info "正在停止 Redis..."
    
    # 优雅关闭
    if command_exists redis-cli; then
        redis-cli -p $REDIS_PORT shutdown 2>/dev/null
        
        # 等待进程退出
        local count=0
        while check_redis_status && [ $count -lt 10 ]; do
            sleep 0.5
            count=$((count + 1))
        done
        
        if ! check_redis_status; then
            log_success "Redis 已优雅停止"
            return 0
        fi
    fi
    
    # 强制停止
    log_warn "优雅停止失败，尝试强制停止..."
    local pid=$(pgrep -x "redis-server" 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 1
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
            log_warn "Redis 已被强制停止"
        else
            log_success "Redis 已停止"
        fi
    else
        log_success "Redis 进程已不存在"
    fi
    
    return 0
}

install_redis() {
    log_step "安装 Redis..."
    
    if command_exists redis-server; then
        local version=$(redis-server --version 2>/dev/null | grep -oP 'v=\K[0-9.]+' | head -1)
        log_success "Redis 已安装: v${version:-未知}"
        return 0
    fi
    
    log_info "检测到 Redis 未安装，开始安装..."
    
    if command_exists apt-get; then
        sudo apt-get update && sudo apt-get install -y redis-server
    elif command_exists yum; then
        sudo yum install -y redis
    elif command_exists pacman; then
        sudo pacman -S --noconfirm redis
    elif command_exists apk; then
        sudo apk add redis
    else
        log_error "无法自动安装 Redis，请手动安装: https://redis.io/download"
        return 1
    fi
    
    if command_exists redis-server; then
        log_success "Redis 安装完成！"
    else
        log_error "Redis 安装失败"
        return 1
    fi
}

# ==================== 端口检查 ====================
check_port() {
    local port=$1
    if command_exists lsof && lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    elif command_exists netstat && netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 1
    elif command_exists ss && ss -tuln 2>/dev/null | grep -q ":$port "; then
        return 1
    fi
    return 0
}

# ==================== 服务状态检查 ====================
check_service_status() {
    local pid_file=$1
    local port=$2
    local health_endpoint=${3:-""}
    
    # 使用 curl 检测服务是否响应
    if command_exists curl; then
        if [ -n "$health_endpoint" ]; then
            curl -s --connect-timeout 2 "http://localhost:$port$health_endpoint" >/dev/null 2>&1 && return 0
        else
            curl -s --connect-timeout 2 "http://localhost:$port" >/dev/null 2>&1 && return 0
        fi
    fi
    
    return 1
}

# ==================== 生成密钥 ====================
generate_secret_key() {
    if command_exists openssl; then
        openssl rand -base64 32 | head -c 32
    else
        head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
    fi
}

# ==================== 头部和状态显示 ====================
print_header() {
    echo -e "\n${MAGENTA}╔═══════════════════════════════════════════╗${NC}
${MAGENTA}║${NC}      📖 Mio's Diary - 日记本 v${PROJECT_VERSION}        ${MAGENTA}║${NC}
${MAGENTA}║${NC}   https://github.com/zlyawa/mio-diary    ${MAGENTA}║${NC}
${MAGENTA}╚═══════════════════════════════════════════╝${NC}\n"
}

show_status() {
    local backend_status="${RED}● 停止${NC}" frontend_status="${RED}● 停止${NC}" redis_status="${RED}● 停止${NC}"
    local backend_pid="" frontend_pid="" redis_pid=""
    
    # 检查后端状态
    if check_service_status "$LOGS_DIR/backend.pid" $BACKEND_PORT "/api/health"; then
        backend_status="${GREEN}● 运行中${NC}"
        [ -f "$LOGS_DIR/backend.pid" ] && backend_pid=$(cat "$LOGS_DIR/backend.pid")
    elif [ -f "$LOGS_DIR/backend.pid" ]; then
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    # 检查前端状态
    if check_service_status "$LOGS_DIR/frontend.pid" $FRONTEND_PORT; then
        frontend_status="${GREEN}● 运行中${NC}"
        [ -f "$LOGS_DIR/frontend.pid" ] && frontend_pid=$(cat "$LOGS_DIR/frontend.pid")
    elif [ -f "$LOGS_DIR/frontend.pid" ]; then
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    # 检查 Redis 状态
    if check_redis_status; then
        redis_status="${GREEN}● 运行中${NC}"
        redis_pid=$(pgrep -x "redis-server" 2>/dev/null | head -1)
    fi
    
    echo -e "${BLUE}【服务状态】${NC}"
    echo -e "  后端: $backend_status ${backend_pid:+(PID: $backend_pid)}"
    echo -e "  前端: $frontend_status ${frontend_pid:+(PID: $frontend_pid)}"
    echo -e "  Redis: $redis_status ${redis_pid:+(PID: $redis_pid)}"
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
        echo -e "  数据库: SQLite ($(du -h "$SCRIPT_DIR/backend/prisma/dev.db" 2>/dev/null | cut -f1))"
    if command_exists redis-server; then
        local redis_version=$(redis-server --version 2>/dev/null | grep -oP 'v=\K[0-9.]+' | head -1)
        echo -e "  Redis: v${redis_version:-已安装}"
    else
        echo -e "  Redis: 未安装"
    fi
    echo ""
}

# ==================== 安装依赖 ====================
install_deps() {
    log_step "📦 安装依赖..."
    
    if ! command_exists node; then
        log_error "未检测到 Node.js，请先安装 Node.js 18+"
        exit 1
    fi
    
    local NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18+ (当前: $(node -v))"
        exit 1
    fi
    
    log_info "Node.js: $(node -v) | npm: $(npm -v)"
    
    # 后端
    log_step "安装后端依赖..."
    cd "$SCRIPT_DIR/backend"
    if [ -d "node_modules" ]; then
        log_info "清理旧依赖..."
        rm -rf node_modules
    fi
    npm install
    
    if [ ! -f ".env" ]; then
        log_info "生成配置文件..."
        # 生成加密密钥
        local encryption_key=$(generate_secret_key)$(generate_secret_key | head -c 16)
        local encryption_iv=$(generate_secret_key | head -c 16)
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

# 配置加密密钥（用于加密存储敏感配置如API Key）
CONFIG_ENCRYPTION_KEY=$encryption_key
CONFIG_ENCRYPTION_IV=$encryption_iv

# Redis 配置（无密码）
REDIS_HOST=localhost
REDIS_PORT=$REDIS_PORT
EOF
        log_success "后端 .env 已创建（含加密密钥）"
    else
        # 检查是否缺少加密密钥，如果缺少则补充
        if ! grep -q "CONFIG_ENCRYPTION_KEY" .env 2>/dev/null; then
            log_info "补充加密密钥配置..."
            local encryption_key=$(generate_secret_key)$(generate_secret_key | head -c 16)
            local encryption_iv=$(generate_secret_key | head -c 16)
            echo "" >> .env
            echo "# 配置加密密钥（用于加密存储敏感配置如API Key）" >> .env
            echo "CONFIG_ENCRYPTION_KEY=$encryption_key" >> .env
            echo "CONFIG_ENCRYPTION_IV=$encryption_iv" >> .env
            log_success "加密密钥已补充到 .env"
        fi
    fi
    
    log_step "🗄️ 初始化数据库..."
    npx prisma generate 2>/dev/null || true
    if [ ! -f "prisma/dev.db" ]; then
        npx prisma migrate dev --name init --skip-generate 2>/dev/null || true
        log_success "数据库初始化完成"
    fi
    
    # 前端
    log_step "安装前端依赖..."
    cd "$SCRIPT_DIR/frontend"
    if [ -d "node_modules" ]; then
        log_info "清理旧依赖..."
        rm -rf node_modules
    fi
    npm install --legacy-peer-deps
    
    if [ ! -f ".env" ]; then
        echo "VITE_API_URL=http://localhost:$BACKEND_PORT/api" > .env
        log_success "前端 .env 已创建"
    fi
    
    cd "$SCRIPT_DIR"
    log_success "依赖安装完成！"
}

# ==================== 启动服务 ====================
start_services() {
    log_step "🚀 启动服务..."
    mkdir -p "$LOGS_DIR"
    
    # 检查端口
    if ! check_port $BACKEND_PORT; then
        log_error "端口 $BACKEND_PORT 已被占用"
        exit 1
    fi
    if ! check_port $FRONTEND_PORT; then
        log_error "端口 $FRONTEND_PORT 已被占用"
        exit 1
    fi
    
    # 检查依赖
    if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
        log_error "后端依赖未安装，请先运行: $0 install"
        exit 1
    fi
    if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
        log_error "前端依赖未安装，请先运行: $0 install"
        exit 1
    fi
    
    # 自动启动 Redis
    if ! check_redis_status; then
        log_info "检测到 Redis 未运行，正在启动..."
        if command_exists redis-server; then
            redis-server --daemonize yes \
                --port $REDIS_PORT \
                --logfile "$LOGS_DIR/redis.log"
            sleep 1
            if check_redis_status; then
                log_success "Redis 已自动启动 (端口: $REDIS_PORT)"
            else
                log_warn "Redis 启动失败，但将继续启动其他服务"
            fi
        else
            log_warn "Redis 未安装，跳过启动 (可用 $0 install-redis 安装)"
        fi
    else
        log_info "Redis 已在运行"
    fi
    
    # 检查数据库
    if [ ! -f "$SCRIPT_DIR/backend/prisma/dev.db" ]; then
        log_warn "数据库未初始化..."
        cd "$SCRIPT_DIR/backend" && npx prisma migrate dev --name init --skip-generate 2>/dev/null || true
        cd "$SCRIPT_DIR"
    fi
    
    # 启动后端
    if check_service_status "$LOGS_DIR/backend.pid" $BACKEND_PORT "/api/health"; then
        log_warn "后端已在运行"
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
        log_warn "前端已在运行"
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
        if command_exists curl; then
            if curl -s "http://localhost:$BACKEND_PORT/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
                backend_ok=true
                break
            fi
        fi
        sleep 1
    done
    
    for i in {1..10}; do
        if command_exists curl && curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
            frontend_ok=true
            break
        fi
        sleep 1
    done
    
    echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  🚀 服务已启动！${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    
    # 显示 Redis 状态
    if check_redis_status; then
        echo -e "${GREEN}✓${NC} Redis: ${CYAN}端口 $REDIS_PORT${NC}"
    fi
    
    if [ "$backend_ok" = true ]; then
        echo -e "${GREEN}✓${NC} 后端: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 后端启动中... (查看日志: $0 log-backend)"
    fi
    
    if [ "$frontend_ok" = true ]; then
        echo -e "${GREEN}✓${NC} 前端: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    else
        echo -e "${YELLOW}⚠${NC} 前端启动中... (查看日志: $0 log-frontend)"
    fi
    
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
    
    # 停止后端
    if check_service_status "$LOGS_DIR/backend.pid" $BACKEND_PORT "/api/health"; then
        log_info "停止后端..."
        if [ -f "$LOGS_DIR/backend.pid" ]; then
            local pid=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null
                local count=0
                while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                    sleep 0.5
                    count=$((count + 1))
                done
                if kill -0 $pid 2>/dev/null; then
                    kill -9 $pid 2>/dev/null
                fi
            fi
            rm -f "$LOGS_DIR/backend.pid"
        fi
        pkill -f "node.*server.js" 2>/dev/null || true
        log_success "后端已停止"
        stopped=true
    elif [ -f "$LOGS_DIR/backend.pid" ]; then
        rm -f "$LOGS_DIR/backend.pid"
    fi
    
    # 停止前端
    if check_service_status "$LOGS_DIR/frontend.pid" $FRONTEND_PORT; then
        log_info "停止前端..."
        if [ -f "$LOGS_DIR/frontend.pid" ]; then
            local pid=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null
                local count=0
                while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                    sleep 0.5
                    count=$((count + 1))
                done
                if kill -0 $pid 2>/dev/null; then
                    kill -9 $pid 2>/dev/null
                fi
            fi
            rm -f "$LOGS_DIR/frontend.pid"
        fi
        pkill -f "vite" 2>/dev/null || true
        log_success "前端已停止"
        stopped=true
    elif [ -f "$LOGS_DIR/frontend.pid" ]; then
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    # 停止 Redis
    if check_redis_status; then
        log_info "停止 Redis..."
        stop_redis
        stopped=true
    fi
    
    if [ "$stopped" = true ]; then
        log_success "所有服务已停止"
    else
        log_warn "没有运行中的服务"
    fi
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
    if [ -f "$LOGS_DIR/backend.log" ]; then
        echo -e "${BLUE}后端日志 (最近50行):${NC}"
        tail -n 50 "$LOGS_DIR/backend.log"
    else
        log_warn "后端日志文件不存在"
    fi
}

show_frontend_logs() {
    if [ -f "$LOGS_DIR/frontend.log" ]; then
        echo -e "${BLUE}前端日志 (最近50行):${NC}"
        tail -n 50 "$LOGS_DIR/frontend.log"
    else
        log_warn "前端日志文件不存在"
    fi
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
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        cd "$SCRIPT_DIR/backend" && npx prisma migrate reset --force
        log_success "数据库已重置"
    else
        log_info "已取消"
    fi
}

db_backup() {
    local backup_dir="$SCRIPT_DIR/backups"
    local backup_file="$backup_dir/dev_db_$(date +%Y%m%d_%H%M%S).db"
    mkdir -p "$backup_dir"
    
    if [ -f "$SCRIPT_DIR/backend/prisma/dev.db" ]; then
        cp "$SCRIPT_DIR/backend/prisma/dev.db" "$backup_file"
        log_success "已备份: $backup_file"
        # 保留最近 10 个备份
        ls -t "$backup_dir"/dev_db_*.db 2>/dev/null | tail -n +11 | xargs -r rm
    else
        log_error "数据库文件不存在"
    fi
}

# ==================== 构建和清理 ====================
build_production() {
    log_step "⚙️ 构建生产版本..."
    
    if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
        log_error "前端依赖未安装，请先运行: $0 install"
        exit 1
    fi
    
    cd "$SCRIPT_DIR/frontend" && npm run build
    
    if [ -d "dist" ]; then
        local size=$(du -sh dist | cut -f1)
        log_success "构建完成: dist/ ($size)"
        echo -e "\n${CYAN}部署提示:${NC}"
        echo -e "  静态文件在: ${CYAN}frontend/dist/${NC}"
        echo -e "  生产环境运行: ${CYAN}NODE_ENV=production npm start${NC}"
    else
        log_error "构建失败"
        exit 1
    fi
}

clean() {
    log_step "清理项目..."
    
    # 询问是否确认
    read -p "确定清理 node_modules 和日志？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "已取消"
        return 0
    fi
    
    # 停止所有服务
    if check_redis_status || [ -f "$LOGS_DIR/backend.pid" ] || [ -f "$LOGS_DIR/frontend.pid" ]; then
        log_warn "检测到运行中的服务，正在停止..."
        stop_services
        sleep 2
    fi
    
    # 清理目录
    rm -rf "$SCRIPT_DIR/backend/node_modules"
    rm -rf "$SCRIPT_DIR/frontend/node_modules"
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
  ${CYAN}Redis:${NC} 6)启动Redis 7)停止Redis 8)安装Redis
  ${CYAN}日志:${NC} 9)实时日志 10)后端日志 11)前端日志
  ${CYAN}数据库:${NC} 12)Studio 13)迁移 14)重置 15)备份
  ${CYAN}其他:${NC} 16)构建 17)清理 18)版本
  0)退出
"
    echo -n "请选择 [0-18]: "
}

main_menu() {
    while true; do
        show_menu
        read -r choice
        case $choice in
            1) install_deps; read -p "按回车继续...";;
            2) start_services; read -p "按回车继续...";;
            3) start_with_logs;;
            4) stop_services; read -p "按回车继续...";;
            5) restart_services; read -p "按回车继续...";;
            6) start_redis; read -p "按回车继续...";;
            7) stop_redis; read -p "按回车继续...";;
            8) install_redis; read -p "按回车继续...";;
            9) show_logs;;
            10) show_backend_logs; read -p "按回车继续...";;
            11) show_frontend_logs; read -p "按回车继续...";;
            12) db_studio; read -p "按回车继续...";;
            13) db_migrate; read -p "按回车继续...";;
            14) db_reset; read -p "按回车继续...";;
            15) db_backup; read -p "按回车继续...";;
            16) build_production; read -p "按回车继续...";;
            17) clean; read -p "按回车继续...";;
            18) show_version; read -p "按回车继续...";;
            0) log_info "再见！"; exit 0;;
            *) log_warn "无效选项，请输入 0-18 之间的数字"; sleep 1;;
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

${CYAN}Redis 命令:${NC}
  start-redis  启动 Redis    stop-redis   停止 Redis    install-redis  安装 Redis

${CYAN}日志命令:${NC}
  log        实时日志      log-backend 后端日志      log-frontend 前端日志

${CYAN}数据库命令:${NC}
  db-studio  Prisma Studio db-migrate  数据库迁移    db-reset  重置数据库
  db-backup  备份数据库

${CYAN}其他:${NC}
  build      构建生产版本  clean       清理项目      help      显示帮助

${CYAN}示例:${NC}
  $0 start           # 启动所有服务（包含 Redis）
  $0 stop            # 停止所有服务（包含 Redis）
  $0 start-redis     # 仅启动 Redis
  $0 stop-redis      # 仅停止 Redis
  $0 log             # 查看实时日志

${CYAN}GitHub:${NC} https://github.com/zlyawa/mio-diary
EOF
}

# ==================== 命令处理 ====================
case "${1:-menu}" in
    # 基础命令
    install) install_deps;;
    start) start_services;;
    start-log) start_with_logs;;
    stop) stop_services;;
    restart) restart_services;;
    status) show_status;;
    version) show_version;;
    
    # Redis 命令
    start-redis) start_redis;;
    stop-redis) stop_redis;;
    install-redis) install_redis;;
    
    # 日志命令
    log) show_logs;;
    log-backend) show_backend_logs;;
    log-frontend) show_frontend_logs;;
    
    # 数据库命令
    db-studio) db_studio;;
    db-migrate) db_migrate;;
    db-reset) db_reset;;
    db-backup) db_backup;;
    
    # 其他
    build) build_production;;
    clean) clean;;
    help) usage;;
    menu) main_menu;;
    *) usage;;
esac