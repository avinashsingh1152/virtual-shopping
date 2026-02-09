@echo off
REM Deployment Script for Virtual Shopping Platform (Windows)
REM This script automates the deployment process

echo ========================================
echo Virtual Shopping Platform - Deployment
echo ========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    git init
    git add .
    git commit -m "Initial commit for deployment"
    echo Git initialized successfully
) else (
    echo Git already initialized
)

echo.
echo Deploying Frontend to Vercel...
echo --------------------------------
echo.

cd frontend

REM Check if vercel is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

REM Deploy to Vercel
echo Deploying to Vercel...
vercel --prod

cd ..

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Deploy backend to Render.com manually (see DEPLOYMENT.md)
echo 2. Update VITE_API_BASE_URL in Vercel dashboard
echo 3. Update CORS settings in backend with your Vercel URL
echo.
echo Full deployment guide: DEPLOYMENT.md
echo.
pause
