@echo off
set "NODE=node"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
where "%NODE%" >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js 18+ hoac chay tu Codex.
  pause
  exit /b 1
)
start "Zalo Local Task" /min "%NODE%" "%~dp0server.js"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:4317
