@echo off
cd /d "%~dp0"
title medical-cloud-backend

echo Killing process on port 3006...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3006 ^| findstr LISTENING') do (
  echo taskkill PID=%%a
  taskkill /PID %%a /F >nul 2>&1
)

ping -n 2 127.0.0.1 >nul
echo Starting backend...
npm run dev
