#!/bin/bash

# Скрипт для запуска бэкенда и фронтенда одновременно

echo "Starting Praktis ID Dashboard..."

# Запуск бэкенда
echo -e "\nStarting Backend Server..."
cd backend
npm install
npm start &
BACKEND_PID=$!
cd ..

# Ждем немного перед запуском фронтенда
sleep 3

# Запуск фронтенда
echo "Starting Frontend..."
cd frontend
npm install
npm start &
FRONTEND_PID=$!
cd ..

echo -e "\nBackend will run on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"
echo -e "\nPress Ctrl+C to stop both servers"

# Ожидание завершения
wait $BACKEND_PID $FRONTEND_PID

