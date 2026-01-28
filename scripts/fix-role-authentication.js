// ============================================================================
// FIX ROLE-BASED AUTHENTICATION IN OFFICE APP
// ============================================================================
// This script updates the authentication logic to properly check database roles
// instead of hardcoded email checks

const fs = require('fs');
const path = require('path');

// File paths to update
const filesToUpdate = [
  'app/admin-login/page.tsx',
  'src/app/page.tsx',
  'app/admin/AdminDashboardClient.tsx'
];

// Helper function to check if user is admin/super admin based on role
const adminRoleCheck = `
  // Helper function to check if user has admin privileges
  const isAdminUser = (user, profile) => {
    if (!user) return false;
    
    // Check profile role first (from database)
    if (profile?.role) {
      const role = profile.role.toLowerCase();
      return ['admin', 'super_admin', 'superadmin'].includes(role);
    }
    
    // Fallback to email check for backward compatibility
    const email = user.email?.toLowerCase() || '';
    return email === 'superadmin@wozamali.co.za' || 
           email === 'admin@wozamali.com' || 
           email.includes('admin@wozamali');
  };
`;

// Update admin-login/page.tsx
function updateAdminLogin() {
  const filePath = 'app/admin-login/page.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace hardcoded email checks with role-based checks
  content = content.replace(
    /const isSuperAdmin = userEmail === 'superadmin@wozamali\.co\.za';\s*const isAdmin = userEmail === 'admin@wozamali\.com' \|\| userEmail\.includes\('admin@wozamali'\);\s*const isAdminUser = isSuperAdmin \|\| isAdmin;/g,
    'const isAdminUser = isAdminUser(user, profile);'
  );
  
  // Add the helper function at the top
  content = content.replace(
    /import { useAuth } from "@\/hooks\/use-auth";/,
    `import { useAuth } from "@/hooks/use-auth";\n\n${adminRoleCheck}`
  );
  
  // Update the login handler
  content = content.replace(
    /const isSuperAdmin = userEmail === 'superadmin@wozamali\.co\.za';\s*const isAdmin = userEmail === 'admin@wozamali\.com' \|\| userEmail\.includes\('admin@wozamali'\);\s*const nextIsAdmin = isSuperAdmin \|\| isAdmin;/g,
    'const nextIsAdmin = isAdminUser({ email }, profile);'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated admin-login/page.tsx');
}

// Update src/app/page.tsx
function updateHomePage() {
  const filePath = 'src/app/page.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add the helper function
  content = content.replace(
    /import { useAuth } from '@\/hooks\/use-auth';/,
    `import { useAuth } from '@/hooks/use-auth';\n\n${adminRoleCheck}`
  );
  
  // Update the role check
  content = content.replace(
    /} else if \(profile && \['ADMIN', 'admin', 'super_admin', 'SUPER_ADMIN'\]\.includes\(profile\.role\)\) {/,
    '} else if (isAdminUser(user, profile)) {'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated src/app/page.tsx');
}

// Update AdminDashboardClient.tsx
function updateAdminDashboard() {
  const filePath = 'app/admin/AdminDashboardClient.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add the helper function
  content = content.replace(
    /import { useAuth } from '@\/hooks\/use-auth';/,
    `import { useAuth } from '@/hooks/use-auth';\n\n${adminRoleCheck}`
  );
  
  // Update the privilege check
  content = content.replace(
    /const isPrivileged = role === 'admin' \|\| role === 'super_admin' \|\| email === 'admin@wozamali\.com';/,
    'const isPrivileged = isAdminUser(user, profile);'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated app/admin/AdminDashboardClient.tsx');
}

// Run the updates
console.log('🔧 Fixing role-based authentication in Office app...\n');

updateAdminLogin();
updateHomePage();
updateAdminDashboard();

console.log('\n✅ Authentication fixes applied!');
console.log('\n📝 Next steps:');
console.log('1. Restart the Office app development server');
console.log('2. Login with superadmin@wozamali.co.za');
console.log('3. The app should now properly recognize super admin role from database');
