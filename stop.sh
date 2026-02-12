#!/bin/bash

############################################
# Mio Diary - 停止服务脚本
# 描述: 停止 Mio 日记应用的所有服务
# 作者: zly
# 版本: v1.0.0
############################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 图标
INFO="[INFO]"
SUCCESS="[✓]"
ERROR="[✗]"
WARN="[!]"

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

# 停止进程函数
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            log_info "正在停止 $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # 如果进程仍然运行，强制终止
            if kill -0 $pid 2>/dev/null; then
                log_warn "$service_name 未响应，强制终止..."
                kill -9 $pid
            fi
            
            log_success "$service_name 已停止"
            rm -f "$pid_file"
        else
            log_warn "$service_name 进程不存在"
            rm -f "$pid_file"
        fi
    else
        log_warn "$service_name PID 文件不存在"
    fi
}

# 主函数
main() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}       停止 Mio Diary 服务             ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo ""
    
    cd "$(dirname "$0")"
    
    stop_process "logs/backend.pid" "后端服务"
    stop_process "logs/frontend.pid" "前端服务"
    
    # 清理可能的残留进程
    log_info "检查残留进程..."
    
    # 检查并杀死可能残留的 Node 进程
    pkill -f "node.*backend" 2>/dev/null || true
    pkill -f "vite.*frontend" 2>/dev/null || true
    
    echo ""
    log_success "所有服务已停止"
    echo ""
}

main
