const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing Next.js cache and browser cache...');

// Clear Next.js cache
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('🗑️  Removing .next directory...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ .next directory removed');
} else {
  console.log('ℹ️  .next directory not found');
}

// Clear node_modules cache
const nodeModulesDir = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(nodeModulesDir)) {
  console.log('🗑️  Removing node_modules cache...');
  fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  console.log('✅ node_modules cache removed');
} else {
  console.log('ℹ️  node_modules cache not found');
}

console.log('\n🔧 Manual steps to clear browser cache:');
console.log('1. Press Ctrl + Shift + Delete');
console.log('2. Select "All time"');
console.log('3. Check all boxes');
console.log('4. Click "Clear data"');
console.log('5. Or use incognito/private browsing mode');

console.log('\n🚀 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Open incognito/private window');
console.log('3. Go to http://localhost:8081');
console.log('4. Log in as admin@wozamali.com');
console.log('5. Check that Team Members is completely gone');

console.log('\n✅ Cache clearing completed!');
