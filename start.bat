@echo off
setlocal

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo ============================================================
echo   College Events Platform — Dev Launcher
echo ============================================================
echo.

REM ── Check node is available ───────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)

REM ── Install dependencies if node_modules missing ──────────────
echo [1/4] Checking dependencies...

if not exist "%ROOT%\server\node_modules" (
    echo       Installing server deps...
    pushd "%ROOT%\server" && call npm install && popd
)
if not exist "%ROOT%\student-portal\node_modules" (
    echo       Installing student-portal deps...
    pushd "%ROOT%\student-portal" && call npm install && popd
)
if not exist "%ROOT%\faculty-portal\node_modules" (
    echo       Installing faculty-portal deps...
    pushd "%ROOT%\faculty-portal" && call npm install && popd
)
if not exist "%ROOT%\superadmin-portal\node_modules" (
    echo       Installing superadmin-portal deps...
    pushd "%ROOT%\superadmin-portal" && call npm install && popd
)

echo       Done.
echo.

REM ── Check .env exists ─────────────────────────────────────────
if not exist "%ROOT%\server\.env" (
    echo [WARN] server\.env not found — copying from .env.example
    copy "%ROOT%\server\.env.example" "%ROOT%\server\.env" >nul
    echo [WARN] Edit server\.env with real values before using in production.
    echo.
)

REM ── Launch all 4 processes in separate windows ────────────────
echo [2/4] Starting API server          ^(http://localhost:5000^)
start "API Server"        cmd /k "cd /d %ROOT%\server && npm run dev"

echo       Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo [3/4] Starting Student Portal      ^(http://localhost:5173^)
start "Student Portal"    cmd /k "cd /d %ROOT%\student-portal && npm run dev"

echo [4/4] Starting Faculty Portal      ^(http://localhost:5174^)
start "Faculty Portal"    cmd /k "cd /d %ROOT%\faculty-portal && npm run dev"

echo [4/4] Starting Superadmin Portal   ^(http://localhost:5175^)
start "Superadmin Portal" cmd /k "cd /d %ROOT%\superadmin-portal && npm run dev"

echo.
echo ============================================================
echo   All services launched in separate windows.
echo.
echo   API Server      :  http://localhost:5000
echo   Student Portal  :  http://localhost:5173
echo   Faculty Portal  :  http://localhost:5174
echo   Superadmin      :  http://localhost:5175
echo   Health check    :  http://localhost:5000/health
echo ============================================================
echo.
echo   Close this window or press any key to exit launcher.
pause >nul
endlocal
