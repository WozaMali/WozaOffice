# 🗄️ Database Schema Files

This directory contains all the SQL schema files for your recycling management system, organized by functionality for easy implementation.

## 📁 **File Structure**

```
schemas/
├── 00-install-all.sql          # Master installation script (run this first!)
├── 01-profiles.sql             # User profiles & authentication
├── 02-addresses.sql            # Address management with geolocation
├── 03-materials.sql            # Materials & pricing system
├── 04-pickups.sql              # Pickup workflow management
├── 05-pickup-items.sql         # Material items & contamination tracking
├── 06-pickup-photos.sql        # Photo management with GPS
├── 07-payments.sql             # Payment processing & automation
└── README.md                   # This file
```

## 🚀 **Quick Start**

### **Option 1: Install Everything at Once (Recommended)**
```sql
-- Run the master installation script
\i schemas/00-install-all.sql
```

### **Option 2: Install Step by Step**
```sql
-- Install each component individually
\i schemas/01-profiles.sql
\i schemas/02-addresses.sql
\i schemas/03-materials.sql
\i schemas/04-pickups.sql
\i schemas/05-pickup-items.sql
\i schemas/06-pickup-photos.sql
\i schemas/07-payments.sql
```

## 📋 **Schema Details**

### **01. Profiles & Authentication** (`01-profiles.sql`)
- **Purpose**: Core user management with role-based access
- **Tables**: `profiles`
- **Features**: 
  - Customer, collector, admin roles
  - Active/inactive user management
  - Row-level security (RLS) policies
- **Dependencies**: None (run first)

### **02. Addresses** (`02-addresses.sql`)
- **Purpose**: Address management with geolocation support
- **Tables**: `addresses`
- **Features**:
  - Multiple addresses per profile
  - GPS coordinates (lat/lng)
  - Primary address designation
  - Automatic timestamp updates
- **Dependencies**: `profiles` table

### **03. Materials** (`03-materials.sql`)
- **Purpose**: Material pricing and categorization
- **Tables**: `materials`
- **Features**:
  - Dynamic pricing per kilogram
  - Material categories (Plastic, Glass, Metal, Paper)
  - Active/inactive material management
  - Sample data included
- **Dependencies**: None (can run independently)

### **04. Pickups** (`04-pickups.sql`)
- **Purpose**: Main pickup workflow management
- **Tables**: `pickups`
- **Features**:
  - Workflow status tracking (submitted → approved/rejected)
  - GPS coordinates for collection location
  - Automatic total calculations
  - Role-based access control
- **Dependencies**: `profiles`, `addresses` tables

### **05. Pickup Items** (`05-pickup-items.sql`)
- **Purpose**: Individual material tracking within pickups
- **Tables**: `pickup_items`
- **Features**:
  - Material-specific weight tracking
  - Contamination percentage tracking
  - Automatic total calculations
  - Real-time pickup value updates
- **Dependencies**: `pickups`, `materials` tables

### **06. Photos** (`06-pickup-photos.sql`)
- **Purpose**: Photo management for pickups
- **Tables**: `pickup_photos`
- **Features**:
  - Photo categorization (scale, bags, other)
  - GPS coordinates for photo location
  - Automatic MIME type detection
  - File metadata tracking
- **Dependencies**: `pickups` table

### **07. Payments** (`07-payments.sql`)
- **Purpose**: Payment processing and automation
- **Tables**: `payments`
- **Features**:
  - Automatic payment creation on pickup approval
  - Multiple payment methods
  - Status tracking (pending → approved/rejected)
  - Reference number management
- **Dependencies**: `pickups` table

### 8. **08-views-and-seed-data.sql** - Dashboard Views & Data
- **Purpose**: Comprehensive dashboard views and seed data
- **Contains**: Material rates, impact calculations, dashboard views, analytics
- **Dependencies**: All previous schema files
- **Key Features**: 
  - **Material Rates**: PET (R1.50), Cans (R18.55), HDPE (R2.00), etc.
  - **Impact Functions**: CO₂, water, landfill saved, trees equivalent
  - **Points System**: Material-based point calculations
  - **Fund Allocation**: 70% Green Scholar Fund, 30% User Wallet
  - **Dashboard Views**: Customer, Collector, Admin with full analytics
  - **Performance Views**: Material, Collector, Customer performance tracking

## 🔧 **Installation Requirements**

### **Prerequisites**
- Supabase project with PostgreSQL database
- `uuid-ossp` extension enabled
- Row Level Security (RLS) enabled

### **Environment Setup**
1. **Create Supabase Project** at [supabase.com](https://supabase.com)
2. **Get Project Credentials** from Settings → API
3. **Configure Environment Variables**:
   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## 📊 **Database Relationships**

```
profiles (1) ←→ (many) addresses
profiles (1) ←→ (many) pickups (as customer)
profiles (1) ←→ (many) pickups (as collector)
pickups (1) ←→ (many) pickup_items
pickups (1) ←→ (many) pickup_photos
pickups (1) ←→ (1) payments
materials (1) ←→ (many) pickup_items
```

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
- **Profiles**: Users can only see their own profile
- **Addresses**: Users can only see their own addresses
- **Pickups**: Users can see pickups they're involved in
- **Materials**: Public read access, admin-only modifications
- **Payments**: Role-based access control

### **Data Validation**
- **Constraints**: Positive values, valid ranges, unique constraints
- **Triggers**: Automatic calculations and metadata updates
- **Cascading**: Proper referential integrity

## 🔄 **Automation Features**

### **Triggers & Functions**
- **Automatic Totals**: Pickup totals update when items change
- **Payment Creation**: Automatic payment creation on pickup approval
- **Timestamp Updates**: Automatic `updated_at` field management
- **MIME Type Detection**: Automatic file type detection for photos

## 📈 **Performance Optimizations**

### **Indexes**
- **Primary Keys**: UUID-based for scalability
- **Foreign Keys**: Indexed for fast joins
- **Status Fields**: Indexed for filtering
- **Location Fields**: Indexed for geospatial queries
- **Timestamps**: Indexed for chronological sorting

### **Query Optimization**
- **Efficient Joins**: Proper foreign key relationships
- **Materialized Views**: Ready for future analytics
- **Partitioning**: Ready for large-scale data

## 🧪 **Testing & Development**

### **Sample Data**
- **Materials**: 8 common recycling materials with realistic pricing
- **Profiles**: Test users for each role (customer, collector, admin)
- **Addresses**: Sample addresses with GPS coordinates

### **Development Workflow**
1. **Install Schema**: Run `00-install-all.sql`
2. **Test Connections**: Verify all tables created
3. **Insert Test Data**: Uncomment sample data sections
4. **Test Application**: Verify frontend integration
5. **Customize**: Modify for your specific needs

## 🚨 **Important Notes**

### **Order Matters**
- Install schemas in the numbered order
- Dependencies must exist before dependent tables
- Master script handles all dependencies automatically

### **Backup First**
- Always backup your database before schema changes
- Test in development environment first
- Use version control for schema changes

### **Customization**
- Modify sample data for your region
- Adjust pricing for your market
- Customize RLS policies for your security needs

## 📚 **Additional Resources**

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **PostgreSQL Documentation**: [postgresql.org/docs](https://postgresql.org/docs)
- **Row Level Security**: [supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Permission Denied**: Check RLS policies
2. **Foreign Key Errors**: Verify table creation order
3. **Extension Errors**: Ensure `uuid-ossp` is enabled
4. **Authentication Issues**: Verify Supabase auth setup

### **Support**
- Check Supabase logs in dashboard
- Verify environment variables
- Test individual schema files
- Review error messages for specific issues

---

**🎉 Your recycling management system is now ready for professional deployment!**
