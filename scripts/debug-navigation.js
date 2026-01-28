const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Navigation Structure...');

// Read AdminLayout file
const adminLayoutPath = path.join(__dirname, 'src', 'components', 'AdminLayout.tsx');
const content = fs.readFileSync(adminLayoutPath, 'utf8');

console.log('\n📋 Navigation Items in AdminLayout:');
const navigationMatch = content.match(/const navigationItems = \[([\s\S]*?)\];/);
if (navigationMatch) {
  const navigationContent = navigationMatch[1];
  const items = navigationContent.split('\n').filter(line => line.trim().startsWith('{'));
  
  items.forEach((item, index) => {
    const nameMatch = item.match(/name: '([^']+)'/);
    const hrefMatch = item.match(/href: '([^']+)'/);
    const superadminOnlyMatch = item.match(/superadminOnly: true/);
    
    if (nameMatch && hrefMatch) {
      const name = nameMatch[1];
      const href = hrefMatch[1];
      const isSuperadminOnly = !!superadminOnlyMatch;
      
      console.log(`   ${index + 1}. ${name} (${href})${isSuperadminOnly ? ' [SUPERADMIN ONLY]' : ''}`);
    }
  });
}

console.log('\n🔧 Role Filtering Logic:');
console.log('   - Settings page: NO role restrictions (should be visible to all admin users)');
console.log('   - Team Members: superadminOnly: true (only visible to superadmin)');
console.log('   - All other pages: No restrictions (visible to all admin users)');

console.log('\n📱 Expected Navigation for Admin Users:');
console.log('   ✅ Dashboard');
console.log('   ❌ Team Members (hidden)');
console.log('   ✅ Users');
console.log('   ✅ Collections');
console.log('   ✅ Analytics');
console.log('   ✅ Resident Summary');
console.log('   ✅ Fund Management');
console.log('   ✅ Rewards');
console.log('   ✅ Withdrawals');
console.log('   ✅ Settings');
console.log('   ✅ Configuration');

console.log('\n📱 Expected Navigation for Superadmin Users:');
console.log('   ✅ Dashboard');
console.log('   ✅ Team Members');
console.log('   ✅ Users');
console.log('   ✅ Collections');
console.log('   ✅ Analytics');
console.log('   ✅ Resident Summary');
console.log('   ✅ Fund Management');
console.log('   ✅ Rewards');
console.log('   ✅ Withdrawals');
console.log('   ✅ Settings');
console.log('   ✅ Configuration');

console.log('\n🚨 If Settings is not visible:');
console.log('   1. Check if you are logged in as admin or superadmin');
console.log('   2. Try refreshing the page');
console.log('   3. Check browser console for errors');
console.log('   4. Try navigating directly to /admin/settings');
console.log('   5. Restart the development server if needed');

console.log('\n✅ Settings page should be visible in the navigation!');
