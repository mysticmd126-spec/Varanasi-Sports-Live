@echo off
title Varanasi Sports Live
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo For a normal public website, upload this project to a Node-compatible hosting service instead.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing required packages...
  npm install
)
start "" http://localhost:3000
npm start
