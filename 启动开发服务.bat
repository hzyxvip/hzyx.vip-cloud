@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 医享云平台 - 开发服务
npm run dev:all
