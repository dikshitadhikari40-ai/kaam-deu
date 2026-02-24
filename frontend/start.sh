#!/bin/bash

# Kaam Deu - Startup Script
# Run this to start the entire application

echo "🚀 Starting Kaam Deu..."
echo ""

# Kill any existing processes on our ports
echo "Cleaning up ports..."
lsof -i :3001 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
lsof -i :8081 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
sleep 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Start both servers
echo ""
echo "Starting servers..."
echo "  Backend: http://localhost:3001"
echo "  Frontend: http://localhost:8081"
echo ""
npm run dev
