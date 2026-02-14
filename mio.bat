@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ===========================================
REM Mio Diary - 统一管理脚本 (Windows)
REM 版本: v2.0.0
REM GitHub: https://github.com/zlyawa/mio-diary
REM ===========================================

REM ==================== 配置 ====================
set PROJECT_VERSION=2.0.0
set BACKEND_PORT=3001
set FRONTEND_PORT=5173
set SCRIPT_DIR=%~dp0
set LOGS_DIR=%SCRIPT_DIR%logs

REM ==================== 主入口 ====================
if "%1"=="" goto menu
if "%1"=="install" goto install_deps
if "%1"=="start" goto start_services
if "%1"=="start-log" goto start_with_logs
if "%1"=="stop" goto stop_services
if "%1"=="restart" goto restart_services
if "%1"=="status" goto show_status
if "%1"=="version" goto show_version
if "%1"=="log" goto show_logs
if "%1"=="log-backend" goto show_backend_logs
if "%1"=="log-frontend" goto show_frontend_logs
if "%1"=="db-studio" goto db_studio
if "%1"=="db-migrate" goto db_migrate
if "%1"=="db-reset" goto db_reset
if "%1"=="db-backup" goto db_backup
if "%1"=="build" goto build_production
if "%1"=="clean" goto clean
if "%1"=="help" goto usage
if "%1"=="-h" goto usage
if "%1"=="--help" goto usage
echo [错误] 未知命令: %1
goto usage

REM ==================== 头部显示 ====================
:print_header
echo.
echo ╔═══════════════════════════════════════════╗
echo ║     📖 Mio's Diary - 日记本 v%PROJECT_VERSION%        ║
echo ║   https://github.com/zlyawa/mio-diary    ║
echo ╚═══════════════════════════════════════════╝
echo.
goto :eof

REM ==================== 状态显示 ====================
:show_status
call :print_header
echo 【服务状态】

REM 检查后端
set backend_running=0
curl -s --connect-timeout 2 http://localhost:%BACKEND_PORT%/api/health >nul 2>&1
if %errorlevel%==0 (
    set backend_running=1
    echo   后端: ● 运行中
) else (
    echo   后端: ○ 停止
)

REM 检查前端
set frontend_running=0
curl -s --connect-timeout 2 http://localhost:%FRONTEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    set frontend_running=1
    echo   前端: ● 运行中
) else (
    echo   前端: ○ 停止
)

echo.
echo 【访问地址】
echo   前端: http://localhost:%FRONTEND_PORT%
echo   后端: http://localhost:%BACKEND_PORT%
echo   管理: http://localhost:%FRONTEND_PORT%/admin
echo.
goto :eof

REM ==================== 版本信息 ====================
:show_version
call :print_header
echo 【版本信息】
echo   项目版本: v%PROJECT_VERSION%
echo   Node.js: 
node -v 2>nul || echo   未安装
echo   npm: 
npm -v 2>nul || echo   未安装
echo.
goto :eof

REM ==================== 安装依赖 ====================
:install_deps
echo.
echo ➤ 安装依赖...

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    exit /b 1
)

echo [信息] Node.js:
node -v
echo [信息] npm:
npm -v

REM 后端
echo.
echo ➤ 安装后端依赖...
cd /d "%SCRIPT_DIR%backend"
if exist "node_modules" (
    echo [信息] 清理旧依赖...
    rmdir /s /q "node_modules" 2>nul
)
call npm install

REM 创建 .env
if not exist ".env" (
    echo [信息] 生成配置文件...
    (
        echo DATABASE_URL="file:./dev.db"
        echo PORT=%BACKEND_PORT%
        echo HOST=localhost
        echo NODE_ENV=development
        echo JWT_SECRET=mio-diary-secret-2026-random-key-32chars
        echo JWT_REFRESH_SECRET=mio-diary-refresh-2026-random-key-32
        echo JWT_EXPIRES_IN=15m
        echo JWT_REFRESH_EXPIRES_IN=7d
        echo MAX_FILE_SIZE=5242880
        echo ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp
    ) > .env
    echo [成功] 后端 .env 已创建
)

echo.
echo ➤ 初始化数据库...
call npx prisma generate 2>nul
if not exist "prisma\dev.db" (
    call npx prisma migrate dev --name init --skip-generate 2>nul
    echo [成功] 数据库初始化完成
)

REM 前端
echo.
echo ➤ 安装前端依赖...
cd /d "%SCRIPT_DIR%frontend"
if exist "node_modules" (
    echo [信息] 清理旧依赖...
    rmdir /s /q "node_modules" 2>nul
)
call npm install --legacy-peer-deps

REM 创建 .env
if not exist ".env" (
    echo VITE_API_URL=http://localhost:%BACKEND_PORT%/api > .env
    echo [成功] 前端 .env 已创建
)

cd /d "%SCRIPT_DIR%"
echo.
echo [成功] 依赖安装完成！
goto :eof

REM ==================== 启动服务 ====================
:start_services
echo.
echo ➤ 启动服务...
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

REM 检查端口
netstat -ano | findstr ":%BACKEND_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [错误] 端口 %BACKEND_PORT% 已被占用
    exit /b 1
)
netstat -ano | findstr ":%FRONTEND_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [错误] 端口 %FRONTEND_PORT% 已被占用
    exit /b 1
)

REM 检查依赖
if not exist "%SCRIPT_DIR%backend\node_modules" (
    echo [错误] 后端依赖未安装，请先运行: mio.bat install
    exit /b 1
)
if not exist "%SCRIPT_DIR%frontend\node_modules" (
    echo [错误] 前端依赖未安装，请先运行: mio.bat install
    exit /b 1
)

REM 启动后端
echo [信息] 启动后端...
cd /d "%SCRIPT_DIR%backend"
start /b "Mio Backend" cmd /c "npm start > %LOGS_DIR%\backend.log 2>&1"
echo [成功] 后端已启动

REM 启动前端
echo [信息] 启动前端...
cd /d "%SCRIPT_DIR%frontend"
start /b "Mio Frontend" cmd /c "npm run dev > %LOGS_DIR%\frontend.log 2>&1"
echo [成功] 前端已启动

cd /d "%SCRIPT_DIR%"

REM 等待服务启动
echo [信息] 等待服务启动...
timeout /t 5 /nobreak >nul

echo.
echo ═══════════════════════════════════════
echo   🚀 服务已启动！
echo ═══════════════════════════════════════
echo ✓ 前端: http://localhost:%FRONTEND_PORT%
echo ✓ 后端: http://localhost:%BACKEND_PORT%
echo.
echo 提示: 'mio.bat log' 查看实时日志
echo.
goto :eof

:start_with_logs
call :start_services
goto show_logs

REM ==================== 停止服务 ====================
:stop_services
echo.
echo ➤ 停止服务...

REM 停止后端进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [信息] 后端已停止
)

REM 停止前端进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [信息] 前端已停止
)

REM 备用：通过进程名停止
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq Mio*" >nul 2>&1

echo [成功] 服务已停止
goto :eof

:restart_services
echo.
echo ➤ 重启服务...
call :stop_services
timeout /t 2 /nobreak >nul
call :start_services
goto :eof

REM ==================== 日志查看 ====================
:show_logs
echo.
echo 【实时日志】 按 Ctrl+C 退出
echo.
if not exist "%LOGS_DIR%\backend.log" type nul > "%LOGS_DIR%\backend.log"
if not exist "%LOGS_DIR%\frontend.log" type nul > "%LOGS_DIR%\frontend.log"

:log_loop
cls
echo === 后端日志 ===
type "%LOGS_DIR%\backend.log" 2>nul | more +1
echo.
echo === 前端日志 ===
type "%LOGS_DIR%\frontend.log" 2>nul | more +1
echo.
echo 按 Ctrl+C 退出，或等待5秒刷新...
timeout /t 5 /nobreak >nul
goto log_loop

:show_backend_logs
echo.
echo 【后端日志】最近50行:
if exist "%LOGS_DIR%\backend.log" (
    powershell -command "Get-Content '%LOGS_DIR%\backend.log' -Tail 50"
) else (
    echo [警告] 日志文件不存在
)
goto :eof

:show_frontend_logs
echo.
echo 【前端日志】最近50行:
if exist "%LOGS_DIR%\frontend.log" (
    powershell -command "Get-Content '%LOGS_DIR%\frontend.log' -Tail 50"
) else (
    echo [警告] 日志文件不存在
)
goto :eof

REM ==================== 数据库管理 ====================
:db_studio
echo [信息] 启动 Prisma Studio...
cd /d "%SCRIPT_DIR%backend"
call npx prisma studio
goto :eof

:db_migrate
echo [信息] 运行数据库迁移...
cd /d "%SCRIPT_DIR%backend"
call npx prisma migrate dev
goto :eof

:db_reset
echo.
echo ⚠ 警告: 这将删除所有数据！
set /p confirm="确定重置数据库？(y/N): "
if /i "%confirm%"=="y" (
    cd /d "%SCRIPT_DIR%backend"
    call npx prisma migrate reset --force
    echo [成功] 数据库已重置
) else (
    echo [信息] 已取消
)
goto :eof

:db_backup
set backup_dir=%SCRIPT_DIR%backups
if not exist "%backup_dir%" mkdir "%backup_dir%"

for /f "tokens=1-6 delims=/:. " %%a in ('echo %date% %time%') do (
    set datetime=%%a%%b%%c_%%d%%e%%f
)
set backup_file=%backup_dir%\dev_db_%datetime%.db

if exist "%SCRIPT_DIR%backend\prisma\dev.db" (
    copy "%SCRIPT_DIR%backend\prisma\dev.db" "%backup_file%" >nul
    echo [成功] 已备份: %backup_file%
) else (
    echo [错误] 数据库不存在
)
goto :eof

REM ==================== 构建和清理 ====================
:build_production
echo.
echo ➤ 构建生产版本...
if not exist "%SCRIPT_DIR%frontend\node_modules" (
    echo [错误] 依赖未安装，请先运行: mio.bat install
    exit /b 1
)
cd /d "%SCRIPT_DIR%frontend"
call npm run build
if exist "dist" (
    echo [成功] 构建完成: dist/
    echo.
    echo 部署提示: 静态文件在 frontend/dist/，设置 NODE_ENV=production
) else (
    echo [错误] 构建失败
)
cd /d "%SCRIPT_DIR%"
goto :eof

:clean
echo.
echo ➤ 清理项目...
if exist "%SCRIPT_DIR%backend\node_modules" rmdir /s /q "%SCRIPT_DIR%backend\node_modules"
if exist "%SCRIPT_DIR%frontend\node_modules" rmdir /s /q "%SCRIPT_DIR%frontend\node_modules"
if exist "%SCRIPT_DIR%frontend\dist" rmdir /s /q "%SCRIPT_DIR%frontend\dist"
if exist "%LOGS_DIR%\*.log" del /q "%LOGS_DIR%\*.log" 2>nul
echo [成功] 清理完成
goto :eof

REM ==================== 帮助 ====================
:usage
echo.
echo Mio Diary v%PROJECT_VERSION% - 管理脚本
echo.
echo 用法: mio.bat [命令]
echo.
echo 基础命令:
echo   install      安装依赖
echo   start        启动服务
echo   start-log    启动服务并显示日志
echo   stop         停止服务
echo   restart      重启服务
echo   status       查看状态
echo   version      版本信息
echo.
echo 日志命令:
echo   log          实时日志
echo   log-backend  后端日志
echo   log-frontend 前端日志
echo.
echo 数据库命令:
echo   db-studio    Prisma Studio
echo   db-migrate   数据库迁移
echo   db-reset     重置数据库
echo   db-backup    备份数据库
echo.
echo 其他:
echo   build        构建生产版本
echo   clean        清理项目
echo   help         显示帮助
echo.
echo 示例: mio.bat start   # 启动服务
echo       mio.bat log     # 查看日志
echo.
echo GitHub: https://github.com/zlyawa/mio-diary
goto :eof

REM ==================== 菜单 ====================
:menu
:menu_loop
cls
call :print_header
call :show_status
echo 【操作菜单】
echo   基础: 1)安装 2)启动 3)启动+日志 4)停止 5)重启
echo   日志: 6)实时日志 7)后端日志 8)前端日志
echo   数据库: 9)Studio 10)迁移 11)重置 12)备份
echo   其他: 13)构建 14)清理 15)版本 16)刷新
echo   0)退出
echo.
set /p choice="请选择 [0-16]: "

if "%choice%"=="1" call :install_deps & pause & goto menu_loop
if "%choice%"=="2" call :start_services & pause & goto menu_loop
if "%choice%"=="3" call :start_with_logs & goto menu_loop
if "%choice%"=="4" call :stop_services & pause & goto menu_loop
if "%choice%"=="5" call :restart_services & pause & goto menu_loop
if "%choice%"=="6" goto show_logs
if "%choice%"=="7" call :show_backend_logs & pause & goto menu_loop
if "%choice%"=="8" call :show_frontend_logs & pause & goto menu_loop
if "%choice%"=="9" call :db_studio & pause & goto menu_loop
if "%choice%"=="10" call :db_migrate & pause & goto menu_loop
if "%choice%"=="11" call :db_reset & pause & goto menu_loop
if "%choice%"=="12" call :db_backup & pause & goto menu_loop
if "%choice%"=="13" call :build_production & pause & goto menu_loop
if "%choice%"=="14" call :clean & pause & goto menu_loop
if "%choice%"=="15" call :show_version & pause & goto menu_loop
if "%choice%"=="16" goto menu_loop
if "%choice%"=="0" echo 再见！ & exit /b 0
echo [警告] 无效选项
timeout /t 1 >nul
goto menu_loop
