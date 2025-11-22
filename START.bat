@echo off
title Hand Tracking Virtual Mouse
echo Starting Hand Tracking Virtual Mouse...
echo.
echo Opening browser at http://localhost:3000
echo Use the STOP button in the app to shut down.
echo.
cd /d "%~dp0"
start http://localhost:3000
npm run dev:full
