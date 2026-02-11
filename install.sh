#!/bin/bash

# Mio的日记本 - 一键安装启动脚本（修复版）
# 功能：检查安装状态、安装依赖、初始化数据库、启动服务、删除安装

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# PID 文件
BACKEND_PID_FILE="$PROJECT_DIR/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_DIR/.frontend.pid"

# 检查 Node.js
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未安装 Node.js${NC}"
        echo "请先安装 Node.js 18+: https://nodejs.org/"
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}错误: Node.js 版本过低 (需要 18+，当前: $(node -v))${NC}"
        exit 1
    fi
}

# 检查是否已安装
check_installed() {
    local backend_installed=false
    local frontend_installed=false

    if [ -d "$BACKEND_DIR/node_modules" ] && [ -f "$BACKEND_DIR/package-lock.json" ]; then
        backend_installed=true
    fi

    if [ -d "$FRONTEND_DIR/node_modules" ] && [ -f "$FRONTEND_DIR/package-lock.json" ]; then
        frontend_installed=true
    fi

    # 检查数据库是否已初始化
    if [ -f "$BACKEND_DIR/prisma/dev.db" ]; then
        echo -e "${GREEN}✓ 数据库文件存在${NC}"
    fi

    if [ "$backend_installed" = true ] && [ "$frontend_installed" = true ]; then
        return 0
    else
        return 1
    fi
}

# 检查服务状态
check_services() {
    local backend_running=false
    local frontend_running=false

    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            backend_running=true
        else
            rm -f "$BACKEND_PID_FILE"
        fi
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            frontend_running=true
        else
            rm -f "$FRONTEND_PID_FILE"
        fi
    fi

    if [ "$backend_running" = true ] || [ "$frontend_running" = true ]; then
        return 0
    else
        return 1
    fi
}

# 生成 JWT 密钥
generate_jwt_secrets() {
    local env_file="$BACKEND_DIR/.env"
    local default_jwt_secret="mio-diary-secret-key-2026-must-be-at-least-32-chars-long"
    local default_refresh_secret="mio-diary-refresh-secret-key-2026-must-be-at-least-32-chars-long"

    if [ ! -f "$env_file" ]; then
        echo -e "${RED}错误: .env 文件不存在${NC}"
        return 1
    fi

    local needs_update=false
    local new_jwt_secret
    local new_refresh_secret

    # 检查 JWT_SECRET 是否是默认值
    if grep -q "^JWT_SECRET=\"$default_jwt_secret\"" "$env_file"; then
        echo -e "${YELLOW}检测到默认 JWT_SECRET，生成新密钥...${NC}"
        new_jwt_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        sed -i "s/^JWT_SECRET=\"$default_jwt_secret\"/JWT_SECRET=\"$new_jwt_secret\"/" "$env_file"
        needs_update=true
    fi

    # 检查 JWT_REFRESH_SECRET 是否是默认值
    if grep -q "^JWT_REFRESH_SECRET=\"$default_refresh_secret\"" "$env_file"; then
        echo -e "${YELLOW}检测到默认 JWT_REFRESH_SECRET，生成新密钥...${NC}"
        new_refresh_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        sed -i "s/^JWT_REFRESH_SECRET=\"$default_refresh_secret\"/JWT_REFRESH_SECRET=\"$new_refresh_secret\"/" "$env_file"
        needs_update=true
    fi

    if [ "$needs_update" = true ]; then
        echo -e "${GREEN}✅ JWT 密钥已更新${NC}"
    else
        echo -e "${GREEN}✅ JWT 密钥已配置，无需更新${NC}"
    fi
}

# ============== 新增：初始化数据库 ==============
init_database() {
    echo -e "${YELLOW}初始化数据库...${NC}"
    cd "$BACKEND_DIR"
    
    # 生成 Prisma 客户端
    echo -e "${YELLOW}生成 Prisma 客户端...${NC}"
    npx prisma generate
    
    # 检查数据库文件是否存在
    if [ ! -f "$BACKEND_DIR/prisma/dev.db" ]; then
        echo -e "${YELLOW}创建新的数据库文件...${NC}"
    fi
    
    # 执行数据库迁移
    echo -e "${YELLOW}执行数据库迁移...${NC}"
    if npx prisma migrate deploy 2>/dev/null; then
        echo -e "${GREEN}✅ 迁移部署成功${NC}"
    else
        echo -e "${YELLOW}没有可用的迁移，创建初始迁移...${NC}"
        npx prisma migrate dev --name init --create-only --skip-generate 2>/dev/null || true
        npx prisma migrate deploy || npx prisma db push
    fi
    
    # 确保数据库是最新状态
    npx prisma db push --accept-data-loss
    
    # 验证数据库连接和表
    echo -e "${YELLOW}验证数据库...${NC}"
    if npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='User';" 2>/dev/null; then
        echo -e "${GREEN}✅ User 表创建成功${NC}"
    else
        echo -e "${RED}⚠️  User 表创建失败，尝试直接推送...${NC}"
        npx prisma db push --force-reset
    fi
    
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
}
# ===============================================

# 安装依赖
install() {
    echo -e "${BLUE}开始安装依赖...${NC}"
    check_nodejs

    echo -e "${YELLOW}生成 JWT 密钥...${NC}"
    generate_jwt_secrets

    echo -e "${YELLOW}安装后端依赖...${NC}"
    cd "$BACKEND_DIR"
    npm install
    echo -e "${GREEN}后端依赖安装完成${NC}"

    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd "$FRONTEND_DIR"
    npm install
    echo -e "${GREEN}前端依赖安装完成${NC}"

    # ============== 新增：安装后初始化数据库 ==============
    init_database
    # ====================================================

    echo -e "${GREEN}✅ 安装完成！${NC}"
}

# 启动服务
start() {
    if ! check_installed; then
        echo -e "${YELLOW}未检测到完整安装，开始安装...${NC}"
        install
    else
        # ============== 新增：启动前检查数据库 ==============
        echo -e "${YELLOW}检查数据库状态...${NC}"
        if [ ! -f "$BACKEND_DIR/prisma/dev.db" ]; then
            echo -e "${YELLOW}数据库文件不存在，初始化数据库...${NC}"
            init_database
        else
            # 验证表是否存在
            cd "$BACKEND_DIR"
            if ! npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='User';" 2>/dev/null | grep -q "User"; then
                echo -e "${YELLOW}User 表不存在，更新数据库...${NC}"
                npx prisma db push
            else
                echo -e "${GREEN}✓ 数据库已就绪${NC}"
            fi
        fi
        # ================================================
    fi

    if check_services; then
        echo -e "${YELLOW}服务已在运行中${NC}"
        show_status
        return
    fi

    echo -e "${BLUE}启动服务...${NC}"

    # 启动后端
    cd "$BACKEND_DIR"
    nohup npm start > "$PROJECT_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    echo -e "${GREEN}后端服务启动中... (端口 3001)${NC}"

    # 等待后端启动
    sleep 3

    # 启动前端
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$PROJECT_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    echo -e "${GREEN}前端服务启动中... (端口 5173)${NC}"

    echo -e "${GREEN}✅ 服务启动成功！${NC}"
    echo -e "${BLUE}前端访问: http://localhost:5173${NC}"
    echo -e "${BLUE}后端API: http://localhost:3001/api${NC}"
}

# 停止服务
stop() {
    echo -e "${BLUE}停止服务...${NC}"

    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        kill "$pid" 2>/dev/null || true
        rm -f "$BACKEND_PID_FILE"
        echo -e "${GREEN}后端服务已停止${NC}"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        kill "$pid" 2>/dev/null || true
        rm -f "$FRONTEND_PID_FILE"
        echo -e "${GREEN}前端服务已停止${NC}"
    fi

    echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 删除安装
uninstall() {
    echo -e "${RED}警告: 这将删除所有安装的依赖和数据库！${NC}"
    read -p "确定要继续吗? (输入 yes 确认): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "取消删除"
        return
    fi

    stop

    echo -e "${YELLOW}删除后端依赖...${NC}"
    rm -rf "$BACKEND_DIR/node_modules"
    rm -f "$BACKEND_DIR/prisma/dev.db"
    rm -f "$BACKEND_DIR/prisma/migrations"
    rm -f "$BACKEND_DIR/package-lock.json"

    echo -e "${YELLOW}删除前端依赖...${NC}"
    rm -rf "$FRONTEND_DIR/node_modules"
    rm -rf "$FRONTEND_DIR/dist"
    rm -f "$FRONTEND_DIR/package-lock.json"

    echo -e "${GREEN}✅ 删除完成${NC}"
}

# 显示状态
show_status() {
    echo -e "\n${BLUE}=== 状态信息 ===${NC}"

    # 安装状态
    if check_installed; then
        echo -e "${GREEN}✓ 依赖已安装${NC}"
    else
        echo -e "${YELLOW}✗ 依赖未安装${NC}"
    fi
    
    # ============== 新增：数据库状态 ==============
    if [ -f "$BACKEND_DIR/prisma/dev.db" ]; then
        echo -e "${GREEN}✓ 数据库文件存在${NC}"
        # 检查 User 表
        cd "$BACKEND_DIR"
        if npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='User';" 2>/dev/null | grep -q "User"; then
            echo -e "${GREEN}✓ User 表已创建${NC}"
        else
            echo -e "${RED}✗ User 表不存在${NC}"
        fi
    else
        echo -e "${RED}✗ 数据库文件不存在${NC}"
    fi
    # =============================================

    # 服务状态
    echo -e "\n${BLUE}服务状态:${NC}"

    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 后端运行中 (PID: $pid)${NC}"
        else
            echo -e "${RED}✗ 后端已停止${NC}"
            rm -f "$BACKEND_PID_FILE"
        fi
    else
        echo -e "${RED}✗ 后端未运行${NC}"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 前端运行中 (PID: $pid)${NC}"
        else
            echo -e "${RED}✗ 前端已停止${NC}"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        echo -e "${RED}✗ 前端未运行${NC}"
    fi

    echo -e "\n${BLUE}访问地址:${NC}"
    echo -e "  前端: http://localhost:5173"
    echo -e "  后端: http://localhost:3001/api"
}

# 显示帮助
show_help() {
    echo -e "${BLUE}Mio的日记本 - 一键管理脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  install   安装依赖并初始化数据库"
    echo "  start     启动服务（自动初始化数据库）"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  status    查看状态"
    echo "  uninstall 删除安装"
    echo "  help      显示帮助"
    echo ""
}

# 交互式菜单
interactive_menu() {
    while true; do
        echo -e "\n${BLUE}=== Mio的日记本 ===${NC}"
        echo ""

        # 显示当前状态
        if check_installed; then
            echo -e "${GREEN}[依赖已安装]${NC}"
        else
            echo -e "${YELLOW}[依赖未安装]${NC}"
        fi

        if [ -f "$BACKEND_DIR/prisma/dev.db" ]; then
            echo -e "${GREEN}[数据库已初始化]${NC}"
        else
            echo -e "${YELLOW}[数据库未初始化]${NC}"
        fi

        if check_services; then
            echo -e "${GREEN}[服务运行中]${NC}"
        else
            echo -e "${YELLOW}[服务已停止]${NC}"
        fi

        echo ""
        echo "1. 安装并初始化"
        echo "2. 启动服务"
        echo "3. 停止服务"
        echo "4. 重启服务"
        echo "5. 查看状态"
        echo "6. 删除安装"
        echo "0. 退出"
        echo ""
        read -p "请选择 (0-6): " choice

        case $choice in
            1) install ;;
            2) start ;;
            3) stop ;;
            4)
                stop
                sleep 1
                start
                ;;
            5) show_status ;;
            6) uninstall ;;
            0) exit 0 ;;
            *) echo -e "${RED}无效选择${NC}" ;;
        esac
    done
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        interactive_menu
    else
        case "$1" in
            install) install ;;
            start) start ;;
            stop) stop ;;
            restart)
                stop
                sleep 1
                start
                ;;
            status) show_status ;;
            uninstall) uninstall ;;
            help|--help|-h) show_help ;;
            *)
                echo -e "${RED}未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    fi
}

main "$@"
