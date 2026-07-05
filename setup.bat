@echo off
cd /d "%~dp0"
echo ============================================
echo  RollCall - one-time setup
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)
echo [1/3] Installing dependencies (this can take a minute)...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: npm install failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo [2/3] Building the app...
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: build failed.
  pause
  exit /b 1
)
echo [3/3] Creating default settings...
if not exist .env copy .env.example .env >nul
echo.
echo ============================================
echo  Setup complete!
echo.
echo  Next steps:
echo   1. Open the .env file with Notepad and paste
echo      your Discord bot token (see SETUP.md).
echo   2. Double-click start.bat to launch RollCall.
echo ============================================
pause
