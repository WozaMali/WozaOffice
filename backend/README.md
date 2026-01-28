# WozaMali Unified Backend

A unified Node.js + Express backend that serves all three WozaMali applications:
- **Main App** (User Frontend) - Customer signup, wallet, collection history
- **Collector App** - Pickup management and kg submission
- **Office App** - Admin dashboard, approval, analytics

## 🚀 Features

- **Unified API** - Single backend for all three apps
- **Real-time Updates** - Socket.IO for instant notifications
- **Role-based Access** - JWT authentication with user/collector/admin roles
- **PostgreSQL Integration** - Works with your existing WozaMali database
- **Comprehensive Endpoints** - Users, pickups, wallets, admin functions
- **Real-time Sync** - Changes appear instantly across all apps

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App     │    │ Collector App   │    │   Office App    │
│  (Port 3000)   │    │  (Port 3001)    │    │  (Port 3002)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Unified Backend │
                    │   (Port 5000)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ PostgreSQL DB   │
                    │  (Your Schema)  │
                    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database with your existing WozaMali schema
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd WozaMaliOffice/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=woza_mali
DB_USER=postgres
DB_PASSWORD=your-password

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration (Main App)
- `POST /login` - User login (All Apps)
- `POST /create-admin` - Create admin user (Office App)
- `POST /refresh` - Refresh JWT token
- `GET /me` - Get current user profile

### Users (`/api/users`)
- `GET /me` - Get current user profile
- `PATCH /me` - Update current user profile
- `GET /:id` - Get user by ID (Admin)
- `GET /` - Get all users (Admin)
- `PATCH /:id/role` - Update user role (Admin)
- `PATCH /:id/status` - Toggle user status (Admin)
- `GET /:id/addresses` - Get user addresses
- `POST /:id/addresses` - Add user address
- `PATCH /:id/addresses/:addressId` - Update address
- `DELETE /:id/addresses/:addressId` - Delete address

### Pickups (`/api/pickups`)
- `GET /` - Get pickups (role-based)
- `GET /:id` - Get single pickup
- `POST /` - Create pickup (Admin)
- `PATCH /:id/status` - Update pickup status (Collector)
- `PATCH /:id/approval` - Approve/reject pickup (Admin)
- `GET /stats/overview` - Pickup statistics (Admin)
- `GET /stats/collectors` - Collector performance (Admin)

### Wallets (`/api/wallets`)
- `GET /my-wallet` - Get current user wallet
- `GET /:userId` - Get wallet by user ID (Admin)
- `PATCH /:userId/balance` - Update wallet balance (Admin)
- `POST /:userId/reset` - Reset wallet to zero (Admin)
- `GET /` - Get all wallets (Admin)
- `GET /stats/overview` - Wallet statistics (Admin)

### Admin (`/api/admin`)
- `GET /dashboard` - Admin dashboard overview
- `GET /customers` - Get all customers
- `GET /collectors` - Get all collectors
- `GET /pickups/analytics` - Pickup analytics
- `GET /financial/overview` - Financial overview
- `POST /bulk/approve-pickups` - Bulk approve pickups
- `POST /maintenance/cleanup` - System maintenance
- `GET /export/:type` - Export data (JSON/CSV)

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "uuid",
  "role": "customer|collector|admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Role-based Access
- **Customer** - Own profile, addresses, wallet, pickups
- **Collector** - Assigned pickups, own profile
- **Admin** - Full system access, all endpoints

### Example Protected Request
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/users/me
```

## 🔌 Real-time Updates (Socket.IO)

### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join user-specific rooms
socket.emit('join-room', {
  userId: 'user-uuid',
  role: 'customer'
});
```

### Events

#### Pickup Updates
- `new-pickup-assigned` - New pickup assigned to collector
- `pickup-status-changed` - Pickup status updated
- `pickup-created` - New pickup created for customer

#### Wallet Updates
- `wallet-balance-changed` - Wallet balance updated

### Example Frontend Integration
```javascript
// Listen for pickup updates
socket.on('pickup-status-changed', (data) => {
  console.log('Pickup updated:', data);
  // Update UI in real-time
});

// Listen for wallet updates
socket.on('wallet-balance-changed', (data) => {
  console.log('Wallet updated:', data);
  // Update wallet display
});
```

## 📱 App Integration Examples

### Main App (Customer)
```javascript
// User registration
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'customer@example.com',
    full_name: 'John Doe',
    phone: '+27123456789',
    password: 'password123',
    street_address: '123 Main St',
    suburb: 'Sandton',
    city: 'Johannesburg'
  })
});

// Get wallet
const walletResponse = await fetch('http://localhost:5000/api/wallets/my-wallet', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Collector App
```javascript
// Get assigned pickups
const pickupsResponse = await fetch('http://localhost:5000/api/pickups', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Update pickup status
const updateResponse = await fetch(`http://localhost:5000/api/pickups/${pickupId}/status`, {
  method: 'PATCH',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'completed',
    total_kg: 15.5,
    total_value: 38.75
  })
});
```

### Office App
```javascript
// Admin dashboard
const dashboardResponse = await fetch('http://localhost:5000/api/admin/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Approve pickup
const approvalResponse = await fetch(`http://localhost:5000/api/pickups/${pickupId}/approval`, {
  method: 'PATCH',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'approved',
    approval_note: 'All materials verified'
  })
});
```

## 🗄️ Database Integration

The backend integrates with your existing WozaMali database schema:

- **`profiles`** - User management
- **`addresses`** - User addresses
- **`pickups`** - Collection management
- **`wallets`** - User wallets
- **`materials`** - Material pricing
- **`pickup_items`** - Individual items collected
- **`transactions`** - Wallet transactions

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure `JWT_SECRET`
4. Configure CORS origins
5. Set up reverse proxy (nginx)

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - Granular permissions
- **CORS Protection** - Controlled cross-origin access
- **Rate Limiting** - Prevent abuse
- **Helmet Security** - Security headers
- **Input Validation** - Request sanitization

## 📊 Monitoring & Logging

- **Morgan** - HTTP request logging
- **Console Logging** - Database queries and errors
- **Error Handling** - Comprehensive error responses
- **Health Check** - `/health` endpoint

## 🧪 Testing

```bash
npm test
```

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Use conventional commits

## 📞 Support

For support and questions, contact the WozaMali development team.

## 📄 License

This project is proprietary software for WozaMali.
