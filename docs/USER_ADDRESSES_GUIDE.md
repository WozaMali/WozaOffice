# User Addresses Schema Guide

## Overview
This guide explains how to use the new user addresses schema for member address management in both the collection app and office app.

## Schema Structure

### User Addresses Table
```sql
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),     -- Links to member profile
    address_type TEXT DEFAULT 'primary',      -- primary, secondary, pickup, billing
    address_line1 TEXT NOT NULL,              -- Main address line
    address_line2 TEXT,                       -- Additional address line
    city TEXT NOT NULL,                       -- City
    province TEXT NOT NULL,                   -- Province/State
    postal_code TEXT,                         -- Postal/ZIP code
    country TEXT DEFAULT 'South Africa',      -- Country
    coordinates POINT,                        -- GPS coordinates for mapping
    is_default BOOLEAN DEFAULT false,         -- Default address flag
    is_active BOOLEAN DEFAULT true,           -- Active status
    notes TEXT,                               -- Delivery instructions
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Key Features

### 1. **Multiple Address Types**
- **Primary**: Main residence address
- **Secondary**: Alternative address
- **Pickup**: Collection/pickup address
- **Billing**: Billing address

### 2. **Default Address Management**
- One default address per type per user
- Automatic default selection
- Easy default address switching

### 3. **GPS Coordinates**
- `POINT` data type for precise location
- Route optimization support
- Mapping integration ready

### 4. **Flexible Address Structure**
- Two address lines for complex addresses
- Province/State support
- Country specification
- Delivery notes/instructions

## Available Views

### 1. `member_user_addresses_view`
**Purpose**: Comprehensive view for all member addresses
**Use Case**: General member address queries

```sql
SELECT * FROM member_user_addresses_view WHERE member_id = 'uuid-here';
```

**Key Fields**:
- `address_id` - Address ID
- `member_id` - Member ID
- `address_type` - Type of address (primary, pickup, etc.)
- `full_address` - Complete formatted address
- `short_address` - Short address for lists
- `coordinates` - GPS coordinates
- `is_default` - Default address flag
- Collection statistics and wallet information

### 2. `collection_member_user_addresses_view`
**Purpose**: Simplified view for collection app
**Use Case**: Collection app member address display

```sql
SELECT * FROM collection_member_user_addresses_view 
WHERE customer_status = 'active' AND address_type = 'pickup';
```

**Key Fields**:
- `address_id` - Address ID
- `member_id` - Member ID
- `member_name` - Member full name
- `address_type` - Address type
- `display_address` - Formatted address for display
- `customer_status` - Activity level
- `coordinates` - GPS coordinates for mapping

### 3. `office_member_user_addresses_view`
**Purpose**: Comprehensive view for office app
**Use Case**: Office app member management

```sql
SELECT * FROM office_member_user_addresses_view 
WHERE total_pickups > 0 
ORDER BY last_pickup_date DESC;
```

**Key Fields**:
- All member profile information
- Complete address details with type
- Collection statistics
- Financial statistics
- Wallet information

## Helper Functions

### 1. `get_user_addresses(user_id, requesting_user_id)`
**Purpose**: Get all addresses for a user
**Returns**: JSONB with addresses array

```sql
SELECT get_user_addresses('member-uuid', 'requesting-user-uuid');
```

**Response**:
```json
{
  "user_id": "uuid",
  "addresses": [
    {
      "id": "address-uuid",
      "address_type": "primary",
      "address_line1": "123 Main Street",
      "city": "Cape Town",
      "province": "Western Cape",
      "is_default": true,
      "coordinates": "POINT(18.4241 -33.9249)"
    }
  ],
  "retrieved_at": "2024-01-01T12:00:00Z"
}
```

### 2. `set_default_address(address_id, user_id)`
**Purpose**: Set an address as default for its type
**Returns**: JSONB with success status

```sql
SELECT set_default_address('address-uuid', 'user-uuid');
```

**Response**:
```json
{
  "success": true,
  "message": "Default address updated successfully",
  "address_id": "address-uuid",
  "address_type": "pickup",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### 3. `get_default_address(user_id, address_type)`
**Purpose**: Get default address for a user
**Returns**: JSONB with address details

```sql
SELECT get_default_address('user-uuid', 'pickup');
```

**Response**:
```json
{
  "found": true,
  "address": {
    "id": "address-uuid",
    "address_type": "pickup",
    "address_line1": "456 Business Park",
    "city": "Cape Town",
    "province": "Western Cape",
    "coordinates": "POINT(18.4241 -33.9249)"
  }
}
```

## Usage Examples

### For Collection App
```sql
-- Get pickup addresses for active customers
SELECT 
    address_id,
    member_name,
    member_phone,
    display_address,
    coordinates,
    customer_status,
    notes
FROM collection_member_user_addresses_view 
WHERE customer_status IN ('active', 'new_customer')
    AND address_type = 'pickup'
    AND is_default = true
ORDER BY last_collection_date ASC;
```

### For Office App
```sql
-- Get all addresses for a member with collection history
SELECT 
    member_id,
    full_name,
    email,
    address_type,
    full_address,
    total_pickups,
    completed_pickups,
    total_value_collected,
    wallet_balance,
    tier
FROM office_member_user_addresses_view 
WHERE member_id = 'member-uuid'
ORDER BY address_type, is_default DESC;
```

### For Address Management
```sql
-- Get all addresses for a specific member
SELECT 
    address_id,
    address_type,
    address_line1,
    city,
    province,
    full_address,
    is_default,
    total_pickups
FROM member_user_addresses_view 
WHERE member_id = 'member-uuid'
ORDER BY address_type, is_default DESC, created_at ASC;
```

## Integration with Pickups

### Linking Pickups to User Addresses
The schema adds a `pickup_address_id` column to the pickups table:

```sql
-- Create pickup with specific address
INSERT INTO pickups (
    customer_id,
    pickup_address_id,  -- Links to user_addresses.id
    pickup_date,
    status
) VALUES (
    'member-uuid',
    'address-uuid',
    '2024-01-15',
    'pending'
);
```

### Querying Pickups with Address Details
```sql
-- Get pickups with full address information
SELECT 
    pk.id as pickup_id,
    pk.status,
    pk.pickup_date,
    p.full_name as member_name,
    ua.address_type,
    ua.full_address,
    ua.coordinates
FROM pickups pk
JOIN profiles p ON pk.customer_id = p.id
JOIN user_addresses ua ON pk.pickup_address_id = ua.id
WHERE pk.status = 'pending';
```

## Best Practices

### 1. **Use Appropriate Address Types**
- Use `pickup` for collection addresses
- Use `primary` for main residence
- Use `secondary` for alternative locations

### 2. **Set Default Addresses**
- Always set a default address for each type
- Use `set_default_address()` function to manage defaults

### 3. **Handle GPS Coordinates**
- Store coordinates as `POINT` for mapping
- Use for route optimization
- Validate coordinate accuracy

### 4. **Use Helper Functions**
- Use `get_user_addresses()` for comprehensive address data
- Use `get_default_address()` for quick default lookups
- Use `set_default_address()` for address management

### 5. **Consider Performance**
- Use appropriate indexes for filtering
- Filter by `is_active = true` for current addresses
- Use `address_type` filters for specific use cases

## Migration from Old Schema

### If you have existing addresses in the old `addresses` table:

```sql
-- Migrate existing addresses to user_addresses
INSERT INTO user_addresses (
    user_id,
    address_type,
    address_line1,
    city,
    province,
    postal_code,
    is_default,
    is_active,
    created_at,
    updated_at
)
SELECT 
    customer_id,
    'primary',
    street_address,
    city,
    'Western Cape', -- Set appropriate province
    postal_code,
    is_primary,
    is_active,
    created_at,
    updated_at
FROM addresses
WHERE customer_id IS NOT NULL;
```

## Security

### Row Level Security (RLS)
- Users can only view their own addresses
- Admins can view all addresses
- Proper permission checks in functions

### Function Security
- All functions use `SECURITY DEFINER`
- Permission checks before data access
- Safe parameter handling

## Troubleshooting

### Common Issues
1. **Missing addresses**: Check if `is_active = true`
2. **Wrong address type**: Use appropriate `address_type` filter
3. **Permission errors**: Ensure proper user authentication
4. **Performance issues**: Use appropriate indexes and filters

### Verification Queries
Run the verification queries in `setup-user-addresses-schema.sql` to ensure everything is working correctly.

## Next Steps

1. **Run the setup script** to create the schema
2. **Migrate existing data** if needed
3. **Update your applications** to use the new views and functions
4. **Test with sample data** to ensure everything works
5. **Integrate with your collection system** for full functionality

The new user addresses schema provides a much more flexible and comprehensive solution for managing member addresses across both your collection and office applications!
