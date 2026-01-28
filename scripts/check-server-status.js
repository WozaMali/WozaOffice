const http = require('http');

console.log('🔍 Checking Development Server Status...');

const checkServer = (port) => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      console.log(`✅ Server is running on port ${port}`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ Server not running on port ${port}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ Timeout checking port ${port}`);
      resolve(false);
    });
  });
};

const checkPorts = async () => {
  console.log('\n📡 Checking common development ports...');
  
  const ports = [8081, 8080, 3000, 8082];
  const results = [];
  
  for (const port of ports) {
    const isRunning = await checkServer(port);
    results.push({ port, isRunning });
  }
  
  console.log('\n📊 Port Status Summary:');
  results.forEach(({ port, isRunning }) => {
    console.log(`   Port ${port}: ${isRunning ? '✅ Running' : '❌ Not running'}`);
  });
  
  const runningPorts = results.filter(r => r.isRunning);
  if (runningPorts.length > 0) {
    console.log(`\n🎯 Access your app at:`);
    runningPorts.forEach(({ port }) => {
      console.log(`   http://localhost:${port}`);
    });
  } else {
    console.log('\n🚨 No development servers detected!');
    console.log('   Try running: npm run dev');
  }
  
  console.log('\n🔧 If you see webpack chunk errors:');
  console.log('   1. Clear browser cache (Ctrl+Shift+R)');
  console.log('   2. Try incognito/private mode');
  console.log('   3. Check browser console for specific errors');
  console.log('   4. Restart the development server');
};

checkPorts().catch(console.error);
