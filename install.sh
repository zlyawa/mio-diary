#!/bin/bash

############################################
# Mio Diary - 一键安装脚本
# 描述: 自动安装并启动 Mio 日记应用
# 作者: zly
# 版本: v1.2.0
############################################

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时退出

# 脚本参数
PROJECT_NAME="Mio Diary"
BACKEND_PORT=3001
FRONTEND_PORT=5173

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 图标
INFO="[INFO]"
SUCCESS="[✓]"
ERROR="[✗]"
WARN="[!]"

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
    echo -e "\n${BLUE}➤${NC} $1"
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
            return 1  # 端口被占用
        fi
    elif command_exists netstat; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1  # 端口被占用
        fi
    fi
    return 0  # 端口可用
}

############################################
# 打印头部信息
############################################

print_header() {
    cat << "EOF"

╔═══════════════════════════════════════╗
║                                       ║
║         Mio's Diary - 日记本          ║
║        一键安装脚本 v1.2.0            ║
║                                       ║
╚═══════════════════════════════════════╝

EOF
}

############################################
# 环境检查
############################################

check_environment() {
    log_step "正在检查系统环境..."
    
    local all_good=true
    
    # 检查 Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        log_info "Node.js 版本: $(node -v)"
        
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 18.x 或更高版本"
            all_good=false
        else
            log_success "Node.js 版本检查通过"
        fi
    else
        log_error "未检测到 Node.js，请先安装 Node.js 18+"
        log_info "Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        log_info "macOS: brew install node"
        all_good=false
    fi
    
    # 检查 npm
    if command_exists npm; then
        log_info "npm 版本: $(npm -v)"
        log_success "npm 已安装"
    else
        log_error "未检测到 npm"
        all_good=false
    fi
    
    # 检查 git
    if command_exists git; then
        log_info "Git 版本: $(git --version)"
        log_success "Git 已安装"
    else
        log_error "未检测到 Git"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        log_error "环境检查失败，请安装缺失的依赖后重试"
        exit 1
    fi
    
    log_success "环境检查完成"
}

############################################
# 检查端口占用
############################################

check_ports() {
    log_step "正在检查端口占用..."
    
    local port_conflict=false
    
    if ! check_port $BACKEND_PORT; then
        log_warn "后端端口 $BACKEND_PORT 已被占用"
        port_conflict=true
    fi
    
    if ! check_port $FRONTEND_PORT; then
        log_warn "前端端口 $FRONTEND_PORT 已被占用"
        port_conflict=true
    fi
    
    if [ "$port_conflict" = true ]; then
        log_warn "检测到端口冲突，请选择:"
        echo "  1) 继续安装（可能需要手动修改端口）"
        echo "  2) 退出脚本"
        read -p "请选择 [1-2]: " choice
        
        case $choice in
            1) log_info "继续安装，可能遇到端口冲突" ;;
            2) log_info "退出安装"; exit 0 ;;
            *) log_info "继续安装，可能遇到端口冲突" ;;
        esac
    else
        log_success "端口检查通过"
    fi
}

############################################
# 生成随机密钥
############################################

generate_secret_key() {
    # 生成至少32字符的随机密钥
    if command_exists openssl; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        # 备用方法
        head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
    fi
}

############################################
# 安装后端依赖
############################################

install_backend() {
    log_step "正在安装后端依赖..."
    
    cd backend
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "未找到 backend/package.json 文件"
        exit 1
    fi
    
    # 清理旧依赖（如果存在）
    if [ -d "node_modules" ]; then
        log_info "清理旧的 node_modules..."
        rm -rf node_modules
    fi
    
    # 安装依赖
    log_info "正在运行 npm install..."
    if npm install; then
        log_success "后端依赖安装成功"
    else
        log_error "后端依赖安装失败"
        exit 1
    fi
    
    # 生成 JWT 密钥
    log_info "生成安全的 JWT 密钥..."
    
    if [ -f ".env" ]; then
        # 备份现有配置
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        log_info "已备份现有 .env 文件"
    fi
    
    JWT_SECRET=$(generate_secret_key)
    JWT_REFRESH_SECRET=$(generate_secret_key)
    
    # 创建或更新 .env 文件
    cat > .env << EOF
# 数据库配置 (SQLite)
DATABASE_URL="file:./dev.db"

# 服务器配置
PORT=$BACKEND_PORT
HOST=localhost
NODE_ENV=development

# JWT 密钥（自动生成）
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# JWT 过期时间
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
EOF
    
    log_success "JWT 密钥已生成并保存到 .env"
    
    # 初始化数据库
    log_info "初始化数据库..."
    
    # 生成 Prisma Client
    if npx prisma generate; then
        log_success "Prisma Client 生成成功"
    else
        log_warn "Prisma Client 生成失败，但继续安装"
    fi
    
    # 运行数据库迁移
    if npx prisma migrate dev --name init --skip-generate 2>/dev/null || npx prisma migrate dev 2>/dev/null; then
        log_success "数据库迁移完成"
    else
        log_warn "数据库迁移可能已存在或失败，继续安装"
    fi
    
    cd ..
}

############################################
# 安装前端依赖
############################################

install_frontend() {
    log_step "正在安装前端依赖..."
    
    cd frontend
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "未找到 frontend/package.json 文件"
        exit 1
    fi
    
    # 清理旧依赖（如果存在）
    if [ -d "node_modules" ]; then
        log_info "清理旧的 node_modules..."
        rm -rf node_modules
    fi
    
    # 安装依赖（使用 --legacy-peer-deps 解决依赖冲突）
    log_info "正在运行 npm install --legacy-peer-deps..."
    if npm install --legacy-peer-deps; then
        log_success "前端依赖安装成功"
    else
        # 尝试清理缓存后重试
        log_warn "第一次安装失败，尝试清理缓存后重试..."
        npm cache clean --force
        
        if npm install --legacy-peer-deps; then
            log_success "前端依赖安装成功（清理缓存后）"
        else
            log_error "前端依赖安装失败"
            exit 1
        fi
    fi
    
    # 创建 .env 文件
    if [ ! -f ".env" ]; then
        cat > .env << EOF
VITE_API_URL=http://localhost:$BACKEND_PORT/api
EOF
        log_success "前端 .env 文件已创建"
    fi
    
    cd ..
}

############################################
# 启动服务
############################################

start_services() {
    log_step "正在启动服务..."
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动后端
    log_info "启动后端服务..."
    cd backend
    nohup npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    cd ..
    log_success "后端服务已启动 (PID: $BACKEND_PID)"
    
    # 等待后端启动
    log_info "等待后端服务启动..."
    sleep 5
    
    # 检查后端是否成功启动
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        log_error "后端服务启动失败，请查看日志: logs/backend.log"
        cat logs/backend.log
        return 1
    fi
    
    # 启动前端
    log_info "启动前端服务..."
    cd frontend
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"
    
    # 等待前端启动
    sleep 5
    
    log_success "所有服务已启动"
}

############################################
# 显示启动信息
############################################

show_startup_info() {
    log_step "安装完成！"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  ${PROJECT_NAME} 已成功安装并启动！        ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "📝 前端地址: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "🔧 后端地址: ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo ""
    echo -e "📊 进程信息:"
    if [ -f "logs/backend.pid" ]; then
        echo -e "   后端 PID: $(cat logs/backend.pid)"
    fi
    if [ -f "logs/frontend.pid" ]; then
        echo -e "   前端 PID: $(cat logs/frontend.pid)"
    fi
    echo ""
    echo -e "📂 日志文件:"
    echo -e "   后端日志: ${CYAN}logs/backend.log${NC}"
    echo -e "   前端日志: ${CYAN}logs/frontend.log${NC}"
    echo ""
    echo -e "🛑 停止服务:"
    echo -e "   ${YELLOW}./stop.sh${NC}  (停止所有服务)"
    echo ""
    echo -e "📚 更多信息请查看:"
    echo -e "   ${CYAN}https://github.com/zlyawa/mio-diary${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
}

############################################
# 主函数
############################################

main() {
    print_header
    
    # 检查是否在项目根目录
    if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        log_error "未检测到项目目录结构"
        log_info "请确保在 mio-diary 项目根目录下运行此脚本"
        exit 1
    fi
    
    # 执行安装步骤
    check_environment
    check_ports
    install_backend
    install_frontend
    start_services
    show_startup_info
}

# 捕获中断信号
trap 'echo -e "\n${RED}安装被中断${NC}"; exit 1' INT

# 运行主函数
main
