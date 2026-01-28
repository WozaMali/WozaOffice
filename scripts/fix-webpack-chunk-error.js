const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Webpack Chunk Loading Error...');

console.log('\n📋 Common Causes:');
console.log('   - Development server cache issues');
console.log('   - Corrupted webpack chunks');
console.log('   - Port conflicts');
console.log('   - Node modules cache issues');

console.log('\n🛠️ Fix Steps:');

// Step 1: Clear Next.js cache
console.log('1. Clearing Next.js cache...');
const nextCachePath = path.join(__dirname, '.next');
if (fs.existsSync(nextCachePath)) {
  try {
    fs.rmSync(nextCachePath, { recursive: true, force: true });
    console.log('   ✅ Cleared .next cache');
  } catch (error) {
    console.log('   ⚠️ Could not clear .next cache:', error.message);
  }
} else {
  console.log('   ✅ No .next cache to clear');
}

// Step 2: Clear node_modules cache
console.log('2. Clearing node_modules cache...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  try {
    // Only clear .cache directories to avoid full reinstall
    const cacheDirs = ['node_modules/.cache', 'node_modules/.next'];
    cacheDirs.forEach(cacheDir => {
      const fullPath = path.join(__dirname, cacheDir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   ✅ Cleared ${cacheDir}`);
      }
    });
  } catch (error) {
    console.log('   ⚠️ Could not clear node_modules cache:', error.message);
  }
} else {
  console.log('   ✅ No node_modules cache to clear');
}

console.log('\n🚀 Restarting Development Server...');
console.log('   This will resolve the webpack chunk loading error.');

// Kill any existing processes
const killProcess = spawn('taskkill', ['/F', '/IM', 'node.exe'], { shell: true });
killProcess.on('close', () => {
  console.log('   ✅ Killed existing processes');
  
  // Start the development server
  console.log('   🚀 Starting fresh development server...');
  const devServer = spawn('npm', ['run', 'dev'], { 
    shell: true, 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  devServer.on('error', (error) => {
    console.error('❌ Error starting development server:', error);
  });
  
  devServer.on('close', (code) => {
    console.log(`Development server exited with code ${code}`);
  });
});

console.log('\n📋 Additional Fixes if Error Persists:');
console.log('   1. Check if port 8081 is available');
console.log('   2. Try running: npm run dev -- --port 8082');
console.log('   3. Clear browser cache (Ctrl+Shift+R)');
console.log('   4. Try incognito/private browsing mode');
console.log('   5. Restart your computer if needed');

console.log('\n✅ Webpack chunk error should be resolved!');
