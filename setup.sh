#!/bin/bash

echo "🔧 Setting up Sistema Legal..."

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend
npm install
cp .env.example .env
echo "✅ Backend setup complete"

# Frontend setup
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
cp .env.example .env
echo "✅ Frontend setup complete"

# Database setup
echo "🗄️  Setting up database..."
cd ..
echo "Please run the following to setup your database:"
echo "psql -h YOUR_HOST -U YOUR_USER YOUR_DB < database/migrations/001_initial_schema.sql"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your .env files in backend/ and frontend/"
echo "2. Run database migrations"
echo "3. Start development:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
