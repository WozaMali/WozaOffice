@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM WozaMali Quick Start Script for Windows
REM This script sets up the entire WozaMali system including backend and frontends

echo.
echo 🚀 WozaMali Quick Start Script
echo ================================
echo.

REM Check prerequisites
echo [INFO] Checking prerequisites...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not installed. Please install PostgreSQL 12+ first.
    pause
    exit /b 1
)

echo [SUCCESS] Prerequisites check passed
echo [INFO] Node.js: 
node --version
echo [INFO] npm: 
npm --version
echo [INFO] PostgreSQL: 
psql --version
echo.

REM Setup database
echo [INFO] Setting up database...
echo.

REM Check if database exists
psql -lqt -U postgres | findstr "woza_mali" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Database 'woza_mali' already exists
    set /p recreate="Do you want to recreate it? (y/N): "
    if /i "!recreate!"=="y" (
        echo [INFO] Dropping existing database...
        dropdb -U postgres woza_mali 2>nul
    ) else (
        echo [INFO] Using existing database
        goto :setup_backend
    )
)

REM Create database
echo [INFO] Creating database 'woza_mali'...
createdb -U postgres woza_mali

REM Run schema
echo [INFO] Running database schema...
psql -U postgres -d woza_mali -f backend\database-schema.sql

REM Seed data
echo [INFO] Seeding database with test data...
psql -U postgres -d woza_mali -f backend\seed-data.sql

echo [SUCCESS] Database setup completed
echo.

:setup_backend
REM Setup backend
echo [INFO] Setting up backend...
echo.

cd backend

REM Install dependencies
echo [INFO] Installing backend dependencies...
call npm install

REM Setup environment file
if not exist .env (
    echo [INFO] Creating .env file...
    copy .env.example .env
    
    echo [WARNING] Please edit backend\.env with your database credentials:
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=woza_mali
    echo DB_USER=postgres
    echo DB_PASSWORD=your_password
    echo JWT_SECRET=your-super-secret-jwt-key-here
    echo.
    set /p continue="Press Enter after updating .env file..."
)

cd ..
echo [SUCCESS] Backend setup completed
echo.

REM Setup frontends
echo [INFO] Setting up frontend applications...
echo.

REM Main App
echo [INFO] Setting up Main App...
cd frontend-main
call npm install
if not exist .env copy ..\.env.example .env
cd ..
echo [SUCCESS] Main App setup completed

REM Collector App
echo [INFO] Setting up Collector App...
cd frontend-collector
call npm install
if not exist .env copy ..\.env.example .env
cd ..
echo [SUCCESS] Collector App setup completed

REM Office App
echo [INFO] Setting up Office App...
cd frontend-office
call npm install
if not exist .env copy ..\.env.example .env
cd ..
echo [SUCCESS] Office App setup completed

echo [SUCCESS] All frontends setup completed
echo.

REM Start services
echo [INFO] Starting services...
echo.

REM Start backend in background
echo [INFO] Starting backend server...
cd backend
start "WozaMali Backend" cmd /k "npm run dev"
cd ..

REM Wait for backend to start
echo [INFO] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [SUCCESS] Services started successfully
echo.
echo 🎉 WozaMali system is ready!
echo.
echo 📱 App URLs:
echo   Main App (User):     http://localhost:3000
echo   Collector App:       http://localhost:3001
echo   Office App (Admin):  http://localhost:3002
echo   Backend API:         http://localhost:5000
echo.
echo 🔐 Test Accounts (password: password123):
echo   Admin: admin@wozamali.com
echo   Collector: john@wozamali.com
echo   User: alice@example.com
echo.
echo To start frontend apps, run in separate terminals:
echo   cd frontend-main ^&^& npm start
echo   cd frontend-collector ^&^& npm start
echo   cd frontend-office ^&^& npm start
echo.
echo The backend server is running in a new window.
echo Close that window to stop the backend server.
echo.
pause
