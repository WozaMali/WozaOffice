# WozaMali Setup Guide

This guide provides detailed step-by-step instructions for setting up the complete WozaMali recycling management system.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** - Usually comes with Node.js
- **PostgreSQL 12+** - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Setup (Automated)

### For Linux/macOS:
```bash
chmod +x quick-start.sh
./quick-start.sh
```

### For Windows:
```cmd
quick-start.bat
```

The automated scripts will:
1. Check prerequisites
2. Set up the database
3. Install backend dependencies
4. Install frontend dependencies
5. Start the backend server
6. Provide instructions for starting frontends

## 🔧 Manual Setup (Step-by-Step)

### Step 1: Clone the Repository
```bash
git clone https://github.com/WozaMali/WozaMaliOffice.git
cd WozaMaliOffice
```

### Step 2: Set Up Database

#### Create PostgreSQL Database
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database
CREATE DATABASE woza_mali;

# Create user (optional, you can use existing postgres user)
CREATE USER woza_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE woza_mali TO woza_user;

# Exit PostgreSQL
\q
```

#### Run Database Schema
```bash
# Run the main schema
psql -U postgres -d woza_mali -f backend/database-schema.sql

# Seed with test data
psql -U postgres -d woza_mali -f backend/seed-data.sql
```

### Step 3: Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# Use your favorite text editor
nano .env  # Linux/macOS
# or
notepad .env  # Windows
```

#### Required Environment Variables
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=woza_mali
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_SSL=false

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

#### Start Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### Step 4: Set Up Frontend Applications

#### Main App (User Frontend)
```bash
cd ../frontend-main

# Install dependencies
npm install

# Copy environment file
cp ../.env.example .env

# Start development server
npm start
```

#### Collector App
```bash
cd ../frontend-collector

# Install dependencies
npm install

# Copy environment file
cp ../.env.example .env

# Start development server
npm start
```

#### Office App (Admin)
```bash
cd ../frontend-office

# Install dependencies
npm install

# Copy environment file
cp ../.env.example .env

# Start development server
npm start
```

## 🌐 Access URLs

After setup, your applications will be available at:

- **Main App (User)**: http://localhost:3000
- **Collector App**: http://localhost:3001
- **Office App (Admin)**: http://localhost:3002
- **Backend API**: http://localhost:5000

## 🔐 Test Accounts

All test accounts use the password: `password123`

### Admin Users
- **Email**: `admin@wozamali.com`
- **Role**: Full admin access
- **Capabilities**: User management, collection approval, wallet management

- **Email**: `manager@wozamali.com`
- **Role**: Office manager
- **Capabilities**: Same as admin

### Collectors
- **Email**: `john@wozamali.com`
- **Area**: North Area
- **Customers**: Alice, Bob, Frank, Grace

- **Email**: `sarah@wozamali.com`
- **Area**: Central Area
- **Customers**: Carol, David, Henry, Ivy

- **Email**: `mike@wozamali.com`
- **Area**: West Area
- **Customers**: Eva, Jack

- **Email**: `lisa@wozamali.com`
- **Area**: Unassigned
- **Customers**: None

### Test Users (Customers)
- **Email**: `alice@example.com` - North Area
- **Email**: `bob@example.com` - North Area
- **Email**: `carol@example.com` - Central Area
- **Email**: `david@example.com` - Central Area
- **Email**: `eva@example.com` - West Area
- And more...

## 🧪 Testing the System

### 1. Test User Registration
1. Open Main App (http://localhost:3000)
2. Click "Register"
3. Fill in details and submit
4. Verify user appears in Office App

### 2. Test Collection Process
1. Login as collector (e.g., `john@wozamali.com`)
2. Go to Addresses page
3. Select an address
4. Submit collection with kgs and material type
5. Verify status shows as "pending"

### 3. Test Collection Approval
1. Login as admin (`admin@wozamali.com`)
2. Go to Collections page
3. Find pending collection
4. Approve or reject
5. Verify wallet balance updates in Main App

### 4. Test Real-time Updates
1. Open multiple browser windows
2. Login as different users
3. Make changes in one window
4. Verify updates appear in other windows

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Check database exists
psql -U postgres -l | grep woza_mali

# Test connection
psql -U postgres -d woza_mali -c "SELECT version();"
```

#### Port Already in Use
```bash
# Check what's using port 5000
lsof -i :5000  # Linux/macOS
netstat -ano | findstr :5000  # Windows

# Kill process or change port in .env
```

#### Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### CORS Errors
- Ensure `ALLOWED_ORIGINS` in backend `.env` includes your frontend URLs
- Check that backend is running on the expected port
- Verify frontend proxy settings in `package.json`

### Logs and Debugging

#### Backend Logs
```bash
cd backend
npm run dev  # Shows detailed logs
```

#### Frontend Logs
- Open browser Developer Tools (F12)
- Check Console tab for errors
- Check Network tab for API calls

#### Database Logs
```bash
# Enable PostgreSQL logging
sudo nano /etc/postgresql/*/main/postgresql.conf

# Add/modify these lines:
log_statement = 'all'
log_destination = 'stderr'
logging_collector = on

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 Database Schema Overview

The system uses these main tables:

- **users**: User accounts and roles
- **addresses**: User addresses with area assignment
- **collections**: Collection records and status
- **wallets**: User wallet balances
- **transactions**: Wallet transaction history
- **materials**: Material types and pricing

## 🔄 Real-time Features

The system includes real-time updates via WebSockets:

- **New collections**: Collectors see new addresses instantly
- **Status changes**: Users see collection approval/rejection
- **Wallet updates**: Users see balance changes immediately
- **Admin notifications**: Office staff see new submissions

## 🚀 Production Deployment

### Backend Deployment
```bash
cd backend
npm run build
NODE_ENV=production npm start
```

### Frontend Deployment
```bash
cd frontend-main
npm run build
# Deploy build/ folder to your hosting service
```

### Environment Variables
Ensure production environment variables are set:
- Strong JWT secret
- Production database credentials
- Proper CORS origins
- SSL certificates

## 📚 Additional Resources

- [Backend API Documentation](backend/README.md)
- [Database Schema](backend/database-schema.sql)
- [Test Data](backend/seed-data.sql)
- [Main README](README.md)

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all prerequisites are met
4. Check environment variable configuration
5. Create an issue in the repository

## 🎯 Next Steps

After successful setup:

1. **Customize the system** for your specific needs
2. **Add more users** and collectors
3. **Configure areas** and collector assignments
4. **Set up monitoring** and logging
5. **Plan production deployment**

---

**Happy Recycling! ♻️**
