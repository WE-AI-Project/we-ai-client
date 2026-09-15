@echo off
title SynAIpse Desktop Launcher
cd /d "%~dp0"

set PORT=5183

:: 1. Vite 개발 서버 가동 여부 확인 (vite.config.ts의 server.port와 반드시 일치시킬 것)
powershell -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', %PORT%); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    start "" /b cmd /c "npm run dev"
    timeout /t 3 /nobreak >nul
)

:: 2. 브라우저 주소창 및 탭이 없는 완벽한 독립 데스크톱 프로그램 창으로 실행
start "" msedge.exe --app="http://localhost:%PORT%/" --window-size=1480,920 --user-data-dir="%LOCALAPPDATA%\SynAIpseApp"
exit
