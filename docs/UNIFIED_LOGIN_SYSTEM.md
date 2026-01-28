# Unified Login System for Woza Mali

This document explains how the unified login system works across both the Admin/Office UI and Collector UI applications.

## Overview

The system now uses a shared login component (`SharedLogin`) that provides a consistent authentication experience across both applications while maintaining appropriate role-based access control and app-specific features.

## Architecture

### Applications
1. **Admin/Office UI** - Runs on port 8081 (`http://localhost:8081`)
2. **Collector UI** - Runs on port 8082 (`http://localhost:8082`)

### Shared Components
- `SharedLogin` - Unified login component used by both applications
- Consistent UI/UX across both apps
- Role-based redirects based on app context

## Features

### Admin/Office Portal (`/login`)
- Full-featured login with quick login options
- Demo credentials display
- Supabase connection testing
- Redirects to appropriate admin/staff dashboards

### Collector Portal (`/login`)
- Streamlined login interface
- Demo credentials display
- Redirects to collector dashboard
- Simplified for mobile/field use

## Usage

### Starting Both Applications

1. **Start Admin/Office UI:**
   ```bash
   npm run dev
   # Runs on http://localhost:8081
   ```

2. **Start Collector UI:**
   ```bash
   cd collector-app
   npm run dev
   # Runs on http://localhost:8082
   ```

### Access Points

- **Main System Entry:** `http://localhost:8081` - Choose between Admin and Collector apps
- **Admin Login:** `http://localhost:8081/login` - Admin and staff authentication
- **Collector Login:** `http://localhost:8082/login` - Collector authentication

## Authentication Flow

1. **User visits either application**
2. **SharedLogin component handles authentication**
3. **Role-based redirects:**
   - `ADMIN`/`STAFF` → Admin dashboard
   - `COLLECTOR` → Collector dashboard
   - `CUSTOMER` → Customer dashboard (admin app) or home (collector app)

## Demo Credentials

### Admin Users
- **Admin:** `admin@wozamali.com` / `admin123`
- **Staff:** `manager@wozamali.com` / `staff123`

### Collector Users
- **Collector:** `col001@wozamali.com` / `collector123`

## Customization

### SharedLogin Props

```tsx
<SharedLogin 
  appContext="admin" | "collector"
  title="Custom Title"
  description="Custom Description"
  showQuickLogin={true | false}
  showDemoCredentials={true | false}
  showTestConnection={true | false}
/>
```

### App-Specific Features

- **Admin Context:** Full features, quick login, test connection
- **Collector Context:** Streamlined interface, demo credentials only

## Benefits

1. **Consistent UX** - Same login experience across both apps
2. **Maintainability** - Single source of truth for login logic
3. **Role-Based Access** - Appropriate redirects based on user role and app context
4. **Flexibility** - Configurable features per application
5. **Unified Branding** - Consistent Woza Mali branding and styling

## Troubleshooting

### Common Issues

1. **Port Conflicts** - Ensure ports 8081 and 8082 are available
2. **Missing Dependencies** - Run `npm install` in both app directories
3. **Build Errors** - Check console for missing imports or component issues

### Development

- Both apps can run simultaneously
- Shared components are duplicated (not imported) to maintain independence
- Changes to SharedLogin require updating both copies

## Future Enhancements

1. **Single Sign-On (SSO)** - Unified session management
2. **Shared Component Library** - NPM package for shared components
3. **Micro-Frontend Architecture** - More sophisticated app integration
4. **Real-time Sync** - Live data synchronization between apps
