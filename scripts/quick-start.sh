#!/bin/bash

# WozaMali Quick Start Script
# This script sets up the entire WozaMali system including backend and frontends

set -e

echo "🚀 WozaMali Quick Start Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed. Please install PostgreSQL 12+ first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
    print_status "Node.js: $(node -v)"
    print_status "npm: $(npm -v)"
    print_status "PostgreSQL: $(psql --version)"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw woza_mali; then
        print_warning "Database 'woza_mali' already exists"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Dropping existing database..."
            dropdb woza_mali 2>/dev/null || true
        else
            print_status "Using existing database"
            return
        fi
    fi
    
    # Create database
    print_status "Creating database 'woza_mali'..."
    createdb woza_mali
    
    # Run schema
    print_status "Running database schema..."
    psql -d woza_mali -f backend/database-schema.sql
    
    # Seed data
    print_status "Seeding database with test data..."
    psql -d woza_mali -f backend/seed-data.sql
    
    print_success "Database setup completed"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Setup environment file
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        
        print_warning "Please edit backend/.env with your database credentials:"
        echo "DB_HOST=localhost"
        echo "DB_PORT=5432"
        echo "DB_NAME=woza_mali"
        echo "DB_USER=your_username"
        echo "DB_PASSWORD=your_password"
        echo "JWT_SECRET=your-super-secret-jwt-key-here"
        echo
        read -p "Press Enter after updating .env file..."
    fi
    
    cd ..
    print_success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    local app_name=$1
    local app_dir=$2
    local port=$3
    
    print_status "Setting up $app_name..."
    
    cd "$app_dir"
    
    # Install dependencies
    print_status "Installing $app_name dependencies..."
    npm install
    
    # Setup environment file
    if [ ! -f .env ]; then
        print_status "Creating $app_name .env file..."
        cp ../.env.example .env
    fi
    
    cd ..
    print_success "$app_name setup completed"
}

# Setup all frontends
setup_frontends() {
    print_status "Setting up frontend applications..."
    
    setup_frontend "Main App" "frontend-main" 3000
    setup_frontend "Collector App" "frontend-collector" 3001
    setup_frontend "Office App" "frontend-office" 3002
    
    print_success "All frontends setup completed"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Start backend in background
    print_status "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    print_status "Waiting for backend to start..."
    sleep 5
    
    # Check if backend is running
    if curl -s http://localhost:5000/health > /dev/null; then
        print_success "Backend is running on http://localhost:5000"
    else
        print_error "Backend failed to start"
        exit 1
    fi
    
    print_success "Services started successfully"
    echo
    echo "🎉 WozaMali system is ready!"
    echo
    echo "📱 App URLs:"
    echo "  Main App (User):     http://localhost:3000"
    echo "  Collector App:       http://localhost:3001"
    echo "  Office App (Admin):  http://localhost:3002"
    echo "  Backend API:         http://localhost:5000"
    echo
    echo "🔐 Test Accounts (password: password123):"
    echo "  Admin: admin@wozamali.com"
    echo "  Collector: john@wozamali.com"
    echo "  User: alice@example.com"
    echo
    echo "To start frontend apps, run in separate terminals:"
    echo "  cd frontend-main && npm start"
    echo "  cd frontend-collector && npm start"
    echo "  cd frontend-office && npm start"
    echo
    echo "Press Ctrl+C to stop the backend server"
    
    # Wait for user to stop
    wait $BACKEND_PID
}

# Main execution
main() {
    echo
    print_status "Starting WozaMali setup..."
    echo
    
    check_prerequisites
    echo
    
    setup_database
    echo
    
    setup_backend
    echo
    
    setup_frontends
    echo
    
    start_services
}

# Handle script interruption
trap 'echo; print_warning "Setup interrupted"; exit 1' INT

# Run main function
main "$@"
