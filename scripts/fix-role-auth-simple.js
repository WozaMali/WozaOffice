// ============================================================================
// SIMPLE FIX FOR ROLE-BASED AUTHENTICATION
// ============================================================================

const fs = require('fs');

console.log('🔧 Fixing role-based authentication in Office app...\n');

// Update admin-login/page.tsx
function updateAdminLogin() {
  const filePath = 'app/admin-login/page.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add helper function after imports
  const helperFunction = `
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

  // Insert helper function after the last import
  const importEndIndex = content.lastIndexOf('import { useAuth } from "@/hooks/use-auth";');
  if (importEndIndex !== -1) {
    const insertIndex = content.indexOf('\n', importEndIndex) + 1;
    content = content.slice(0, insertIndex) + helperFunction + content.slice(insertIndex);
  }
  
  // Replace hardcoded checks with function calls
  content = content.replace(
    'const isSuperAdmin = userEmail === \'superadmin@wozamali.co.za\';\n      const isAdmin = userEmail === \'admin@wozamali.com\' || userEmail.includes(\'admin@wozamali\');\n      const isAdminUser = isSuperAdmin || isAdmin;',
    'const isAdminUserResult = isAdminUser(user, profile);'
  );
  
  content = content.replace(
    'if (isAdminUser) {',
    'if (isAdminUserResult) {'
  );
  
  content = content.replace(
    'const isSuperAdmin = userEmail === \'superadmin@wozamali.co.za\';\n        const isAdmin = userEmail === \'admin@wozamali.com\' || userEmail.includes(\'admin@wozamali\');\n        const nextIsAdmin = isSuperAdmin || isAdmin;',
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
  
  // Add helper function
  const helperFunction = `
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

  // Insert helper function after imports
  const importEndIndex = content.lastIndexOf('import { useAuth } from \'@/hooks/use-auth\';');
  if (importEndIndex !== -1) {
    const insertIndex = content.indexOf('\n', importEndIndex) + 1;
    content = content.slice(0, insertIndex) + helperFunction + content.slice(insertIndex);
  }
  
  // Update role check
  content = content.replace(
    '} else if (profile && [\'ADMIN\', \'admin\', \'super_admin\', \'SUPER_ADMIN\'].includes(profile.role)) {',
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
  
  // Add helper function
  const helperFunction = `
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

  // Insert helper function after imports
  const importEndIndex = content.lastIndexOf('import { useAuth } from \'@/hooks/use-auth\';');
  if (importEndIndex !== -1) {
    const insertIndex = content.indexOf('\n', importEndIndex) + 1;
    content = content.slice(0, insertIndex) + helperFunction + content.slice(insertIndex);
  }
  
  // Update privilege check
  content = content.replace(
    'const isPrivileged = role === \'admin\' || role === \'super_admin\' || email === \'admin@wozamali.com\';',
    'const isPrivileged = isAdminUser(user, profile);'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated app/admin/AdminDashboardClient.tsx');
}

// Run the updates
updateAdminLogin();
updateHomePage();
updateAdminDashboard();

console.log('\n✅ Authentication fixes applied!');
console.log('\n📝 Next steps:');
console.log('1. Restart the Office app development server');
console.log('2. Login with superadmin@wozamali.co.za');
console.log('3. The app should now properly recognize super admin role from database');
