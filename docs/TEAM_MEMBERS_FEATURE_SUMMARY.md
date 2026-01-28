# Team Members Feature - Superadmin Dashboard

## Overview
A comprehensive team management system for superadmin users to manage admin profiles and approve collector requests.

## Features Implemented

### 1. Team Members Page (`/admin/team-members`)
- **Access**: Only superadmin users can access
- **Navigation**: Added to admin sidebar menu
- **URL**: `http://localhost:8081/admin/team-members`

### 2. Team Member Cards
Each card displays complete signup information:
- ✅ **Name** (First + Last name)
- ✅ **Email** address
- ✅ **Employee Number** (if assigned)
- ✅ **Role** (SUPER_ADMIN, ADMIN, STAFF, COLLECTOR)
- ✅ **Township** (location)
- ✅ **Status** (Active, Pending, Inactive, Suspended)
- ✅ **Created Date** (with timestamp)

### 3. Admin Profile Creation
- **Modal Form**: Create new admin/staff profiles
- **Fields**:
  - Basic Info: First Name, Last Name, Email, Phone
  - Authentication: Password, Confirm Password
  - Role & Department: Role (Admin/Staff), Employee Number, Township, Department
  - Additional: Notes
- **Validation**: Email format, password confirmation, required fields
- **Integration**: Creates both Supabase auth user and database profile

### 4. Collector Approval System
- **Approve/Reject**: Buttons for pending collector requests
- **Status Management**: Automatically updates status on approval/rejection
- **Real-time Updates**: Live status updates from database

### 5. Search & Filtering
- **Search**: By name, email, employee number, township
- **Filters**: Role (All, Super Admin, Admin, Staff, Collector)
- **Status Filters**: All, Active, Pending, Inactive, Suspended

### 6. Statistics Dashboard
- **Total Members**: Count of all team members
- **Pending Approval**: Members awaiting approval
- **Admins**: Administrative staff count
- **Collectors**: Field collector count

## Technical Implementation

### Database Integration
- Uses Supabase for authentication and data storage
- Real-time subscriptions for live updates
- Proper role-based access control

### Components Created
1. `TeamMembersPage` - Main page component
2. `TeamMemberCard` - Individual member card
3. `CreateAdminModal` - Admin creation form
4. Updated `AdminLayout` - Added navigation and access control

### Security Features
- Superadmin-only access
- Role-based permissions
- Secure password handling
- Input validation and sanitization

## Usage Instructions

### 1. Access the Feature
1. Login as superadmin: `superadmin@wozamali.co.za` / `123456`
2. Navigate to "Team Members" in the sidebar
3. View all team members with their details

### 2. Create Admin Profiles
1. Click "Create Admin Profile" button
2. Fill in the required information
3. Select role (Admin or Staff)
4. Add additional details (employee number, township, department)
5. Click "Create Admin" to save

### 3. Approve Collectors
1. Look for members with "Pending" status
2. Click "Approve" to activate the member
3. Click "Reject" to suspend the member
4. Status updates automatically

### 4. Search and Filter
1. Use the search box to find specific members
2. Use role filter to show only certain roles
3. Use status filter to show only certain statuses
4. Combine filters for precise results

## Database Schema Requirements

The feature expects these database tables:
- `users` - Main user profiles
- `roles` - Available roles (SUPER_ADMIN, ADMIN, STAFF, COLLECTOR)
- `auth.users` - Supabase authentication

## Future Enhancements

Potential improvements:
- Bulk approval/rejection
- Email notifications
- Advanced reporting
- Role permission management
- Audit logging
- Export functionality

## Testing

To test the feature:
1. Start the office app: `npm run dev` (runs on port 8081)
2. Login with superadmin credentials
3. Navigate to Team Members page
4. Test creating admin profiles
5. Test approval/rejection workflow
6. Test search and filtering

## Status: ✅ COMPLETE

All requested features have been implemented and are ready for use.
