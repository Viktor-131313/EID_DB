@echo off
echo Installing backend dependencies...
cd backend

if not exist "node_modules" (
    call npm install
)

echo.
echo Starting Backend Server on http://localhost:3001...
echo Press Ctrl+C to stop the server
echo.

node server.js

