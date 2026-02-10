#!/bin/bash

echo "🚀 Deploying Sistema Legal..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Build and start containers
cd docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend API: http://localhost:3000"
