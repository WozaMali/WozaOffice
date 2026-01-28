const { spawn } = require('child_process');

console.log('🔄 Restarting Development Server...');
console.log('This will help ensure the Settings page is visible in the navigation.');

// Kill any existing processes on port 8081
const killProcess = spawn('taskkill', ['/F', '/IM', 'node.exe'], { shell: true });
killProcess.on('close', () => {
  console.log('✅ Killed existing processes');
  
  // Start the development server
  console.log('🚀 Starting development server...');
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

console.log('\n📋 After restart, check:');
console.log('   1. Navigate to http://localhost:8081');
console.log('   2. Login as admin or superadmin');
console.log('   3. Look for "Settings" in the navigation menu');
console.log('   4. Click on Settings to access the personal info form');
console.log('   5. If still not visible, try hard refresh (Ctrl+F5)');
