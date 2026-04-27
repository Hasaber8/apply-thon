#!/bin/bash
set -e

echo "Starting Apply-thon..."
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Start backend
(cd "$(dirname "$0")/backend" && python3 -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Start frontend
(cd "$(dirname "$0")/frontend" && npm run dev) &
FRONTEND_PID=$!

# Wait for Ctrl+C and kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
