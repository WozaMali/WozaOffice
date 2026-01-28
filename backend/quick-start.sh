#!/bin/bash

# WozaMali Unified Backend Quick Start Script
echo "🚀 Starting WozaMali Unified Backend Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your database credentials"
    echo "   - Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo "   - Set JWT_SECRET to a secure random string"
    echo "   - Update ALLOWED_ORIGINS if needed"
    echo ""
    echo "🔧 After editing .env, run: npm run dev"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Ensure your PostgreSQL database is running"
echo "3. Run: npm run dev"
echo "4. Backend will be available at: http://localhost:5000"
echo ""
echo "📚 For more information, see README.md"
