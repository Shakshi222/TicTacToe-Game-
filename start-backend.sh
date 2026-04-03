#!/bin/bash

# Start Backend Services for TicTacToe
echo "🚀 Starting TicTacToe Backend Services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Stop any existing services
echo "🛑 Stopping existing services..."
docker-compose down

# Build and start services
echo "🔧 Building and starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Check Nakama logs for Go plugin loading
echo ""
echo "📋 Checking Nakama startup logs..."
docker-compose logs nakama | tail -20

echo ""
echo "✅ Backend services should now be running!"
echo "🌐 Nakama Console: http://localhost:7350"
echo "🔗 Client API: http://localhost:7349"
echo ""
echo "To check logs: docker-compose logs -f nakama"
echo "To stop services: docker-compose down"