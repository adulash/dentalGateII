@echo off
REM DentalGate II - Git Repository Setup for Coolify Deployment (Windows)

echo ================================================
echo DentalGate II - Git Setup for Coolify
echo ================================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Git is not installed. Please install Git first.
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Initialize git repository if not already initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo Git initialized
) else (
    echo Git repository already initialized
)

echo.
echo Adding files to Git...
git add .

echo.
echo Committing files...
git commit -m "Initial commit - Ready for Coolify deployment"

echo.
echo ================================================
echo Next Steps:
echo ================================================
echo.
echo 1. Create repository on GitHub/GitLab:
echo    - Go to GitHub and create new repository
echo    - Name: dentalGateII
echo    - Don't initialize with README
echo.
echo 2. Add remote and push:
echo    git remote add origin https://github.com/YOUR_USERNAME/dentalGateII.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Deploy to Coolify:
echo    - Follow guide in COOLIFY_DEPLOY.md
echo    - Use checklist in COOLIFY_CHECKLIST.md
echo.
echo ================================================
echo Setup complete!
echo ================================================
echo.
pause

