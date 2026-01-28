# WozaMali - Unified Recycling Management System

A comprehensive recycling management system with three separate frontend applications and a unified backend API, designed to streamline the collection, processing, and reward system for recyclable materials.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App      │    │ Collector App   │    │   Office App    │
│   (User)        │    │   (Collector)   │    │    (Admin)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Backend API    │
                    │  (Node.js +     │
                    │   Express)      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  PostgreSQL     │
                    │   Database      │
                    └─────────────────┘
```

## 🚀 Features

### Main App (User Frontend)
- User registration and authentication
- Wallet balance display
- Collection history tracking
- Real-time wallet updates
- Profile management

### Collector App
- Login and area assignment
- View addresses in assigned area
- Filter addresses by street/suburb
- Submit collection records
- Track submission status
- Real-time address list updates

### Office App (Admin)
- Admin dashboard and analytics
- User management
- Collection approval/rejection
- Wallet management
- Transaction history
- Reports and insights
- Real-time collection notifications

### Backend API
- JWT authentication
- Role-based access control
- RESTful endpoints
- Real-time WebSocket updates
- PostgreSQL database
- Comprehensive logging

## 🛠️ Technology Stack

- **Frontend**: React 18, React Router, Tailwind CSS
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL
- **Authentication**: JWT, bcrypt
- **Real-time**: Socket.IO
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/WozaMali/WozaMaliOffice.git
cd WozaMaliOffice
```

### 2. Set Up Database
```bash
# Create PostgreSQL database
createdb woza_mali

# Run the schema
psql -d woza_mali -f backend/database-schema.sql

# Seed with test data
psql -d woza_mali -f backend/seed-data.sql
```

### 3. Set Up Backend
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=woza_mali
# DB_USER=your_username
# DB_PASSWORD=your_password

# Start the backend
npm run dev
```

### 4. Set Up Frontend Apps

#### Main App (User)
```bash
cd ../frontend-main
npm install
cp ../.env.example .env
npm start
```

#### Collector App
```bash
cd ../frontend-collector
npm install
cp ../.env.example .env
npm start
```

#### Office App (Admin)
```bash
cd ../frontend-office
npm install
cp ../.env.example .env
npm start
```

## 🔐 Test Accounts

All test accounts use the password: `password123`

### Admin Users
- `admin@wozamali.com` - Full admin access
- `manager@wozamali.com` - Office manager

### Collectors
- `john@wozamali.com` - North Area collector
- `sarah@wozamali.com` - Central Area collector
- `mike@wozamali.com` - West Area collector
- `lisa@wozamali.com` - Unassigned collector

### Test Users
- `alice@example.com` - North Area customer
- `bob@example.com` - North Area customer
- `carol@example.com` - Central Area customer
- `david@example.com` - Central Area customer
- `eva@example.com` - West Area customer
- And more...

## 📱 App URLs

- **Main App**: http://localhost:3000
- **Collector App**: http://localhost:3001
- **Office App**: http://localhost:3002
- **Backend API**: http://localhost:5000

## 🔄 Data Flow

1. **User Registration**: User signs up → profile created → wallet initialized → address stored
2. **Collection Process**: Collector sees addresses in area → selects address → submits collection → status: pending
3. **Approval Process**: Admin reviews → approves/rejects → wallet updated → transaction logged
4. **Real-time Updates**: All apps receive instant notifications via WebSockets

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/:id` - Get user by ID (admin)
- `GET /api/users` - Get all users (admin)

### Collections
- `GET /api/collections/addresses` - Get addresses in collector's area
- `POST /api/collections` - Submit collection (collector)
- `GET /api/collections/pending` - Get pending collections (admin)
- `PATCH /api/collections/:id/approval` - Approve/reject collection (admin)

### Wallets
- `GET /api/wallets/my-wallet` - Get user's wallet
- `GET /api/wallets/:id` - Get wallet by ID (admin)
- `PUT /api/wallets/:id/balance` - Update wallet balance (admin)

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/reports` - Generate reports

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm test            # Run tests
npm run lint        # Lint code
```

### Frontend Development
```bash
cd frontend-main    # or frontend-collector, frontend-office
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

### Database Development
```bash
# Connect to database
psql -d woza_mali

# View tables
\dt

# View data
SELECT * FROM users;
SELECT * FROM collections;
SELECT * FROM wallets;
```

## 📁 Project Structure

```
WozaMaliOffice/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth & validation
│   │   ├── config/         # Database config
│   │   └── server.js       # Main server
│   ├── database-schema.sql # Database schema
│   ├── seed-data.sql       # Test data
│   └── package.json
├── frontend-main/          # User frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── App.js
│   └── package.json
├── frontend-collector/     # Collector frontend
├── frontend-office/        # Admin frontend
├── .env.example            # Environment template
└── README.md
```

## 🚀 Deployment

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
Ensure all environment variables are set in production:
- Database credentials
- JWT secret
- CORS origins
- SSL certificates

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend-main
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

The system includes real-time updates for:
- New user registrations in collector areas
- Collection status changes
- Wallet balance updates
- Admin notifications

All updates are delivered instantly via WebSocket connections, ensuring a responsive user experience across all three applications.
