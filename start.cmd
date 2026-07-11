@echo off
set "NODE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined NODE (
  where node >nul 2>nul
  if not errorlevel 1 set "NODE=node"
)
if not defined NODE (
  echo Khong tim thay Node.js. Hay cai Node.js 18+ hoac chay tu Codex.
  pause
  exit /b 1
)
start "Zalo Local Task" /min "%NODE%" "%~dp0server.js"
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
start "" http://127.0.0.1:4317
