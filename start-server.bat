@echo off
title Municipal Management System Server
echo ========================================================
echo Starting Municipal Management System Local Server...
echo ========================================================
echo Serving files at: http://localhost:8000
echo.
echo Opening http://localhost:8000 in your default browser...
start http://localhost:8000
py -m http.server 8000
if %ERRORLEVEL% NEQ 0 (
    python -m http.server 8000
)
pause
