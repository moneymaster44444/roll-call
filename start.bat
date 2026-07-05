@echo off
cd /d "%~dp0"
if not exist dist\index.html (
  echo It looks like setup has not been run yet. Running setup first...
  call setup.bat
)
echo Starting RollCall... keep this window open while using the app.
start /min cmd /c "timeout /t 2 >nul & start http://localhost:3117"
node server\index.js
pause
