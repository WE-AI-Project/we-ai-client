@echo off
title SynAIpse Desktop Launcher
cd /d "D:\SynAIpse\we-ai-client"

:: 1. Vite 개발 서버 가동 여부 확인 (포트 5173)
powershell -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5173); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    start "" /b cmd /c "npm run dev"
    timeout /t 3 /nobreak >nul
)

:: 2. 브라우저 주소창 및 탭이 없는 완벽한 독립 데스크톱 프로그램 창으로 실행
start "" msedge.exe --app="http://localhost:5173/" --window-size=1480,920 --user-data-dir="%LOCALAPPDATA%\SynAIpseApp"
exit
