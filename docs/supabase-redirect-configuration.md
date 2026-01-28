# Supabase Redirect URL Configuration Guide

## Problem
Password reset links are redirecting to `wozamali.co.za` instead of the specific app domains (Office App and Collector App).

## Solution
Configure proper redirect URLs in Supabase Auth settings.

## Step 1: Supabase Dashboard Configuration

### 1.1 Go to Supabase Dashboard
- Open your Supabase project: https://supabase.com/dashboard
- Navigate to **Authentication > URL Configuration**

### 1.2 Configure Site URL
Set the **Site URL** to your main domain:
```
https://wozamali.co.za
```

### 1.3 Configure Redirect URLs
Add these URLs to the **Redirect URLs** list:

#### Development URLs:
```
http://localhost:8080
http://localhost:8081
http://localhost:8082
http://localhost:8080/auth/callback
http://localhost:8081/auth/callback
http://localhost:8082/auth/callback
```

#### Production URLs:
```
https://wozamali.co.za
https://www.wozamali.co.za
https://office.wozamali.co.za
https://www.office.wozamali.co.za
https://collector.wozamali.co.za
https://www.collector.wozamali.co.za
https://wozamali.co.za/auth/callback
https://www.wozamali.co.za/auth/callback
https://office.wozamali.co.za/auth/callback
https://www.office.wozamali.co.za/auth/callback
https://collector.wozamali.co.za/auth/callback
https://www.collector.wozamali.co.za/auth/callback
```

## Step 2: Update Environment Variables

### 2.1 Office App (.env)
Add these to `WozaMaliOffice/.env`:
```env
# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:8081
NEXT_PUBLIC_SUPABASE_SITE_URL=https://office.wozamali.co.za
```

### 2.2 Collector App (.env)
Add these to `WozaMaliCollector/.env`:
```env
# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:8082
NEXT_PUBLIC_SUPABASE_SITE_URL=https://collector.wozamali.co.za
```

## Step 3: Update Supabase Client Configuration

### 3.1 Office App
Update `WozaMaliOffice/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:8081'
  }
})
```

### 3.2 Collector App
Update `WozaMaliCollector/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:8082'
  }
})
```

## Step 4: Test Configuration

### 4.1 Test Password Reset
1. Go to Office App: `http://localhost:8081/admin-login`
2. Click "Forgot Password"
3. Enter email: `superadmin@wozamali.co.za`
4. Check email for reset link
5. Verify link redirects to correct app

### 4.2 Test Collector App
1. Go to Collector App: `http://localhost:8082/login`
2. Test password reset functionality
3. Verify redirects work correctly

## Troubleshooting

### Common Issues:
1. **Still redirecting to main domain**: Check Supabase redirect URLs are saved
2. **404 errors**: Ensure auth callback routes exist
3. **CORS errors**: Verify all domains are in redirect URLs list

### Verification:
- Check Supabase Auth logs for redirect attempts
- Verify environment variables are loaded correctly
- Test with both development and production URLs
