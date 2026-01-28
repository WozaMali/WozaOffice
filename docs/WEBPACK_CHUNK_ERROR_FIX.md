# Webpack Chunk Loading Error Fix

## 🚨 Error Description
```
Uncaught ChunkLoadError: Loading chunk app/layout failed.
(timeout: http://localhost:8081/_next/static/chunks/app/layout.js)
```

## 🔧 Quick Fixes

### 1. Clear Next.js Cache
```bash
# Delete .next directory
rm -rf .next
# Or on Windows:
rmdir /s .next
```

### 2. Clear Node Modules Cache
```bash
# Clear npm cache
npm cache clean --force

# Clear node_modules cache
rm -rf node_modules/.cache
```

### 3. Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### 4. Alternative Port
```bash
# Try different port
npm run dev -- --port 8082
```

## 🛠️ Advanced Fixes

### 1. Complete Clean Install
```bash
# Remove all cache and dependencies
rm -rf .next
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install
npm run dev
```

### 2. Browser Cache Clear
- **Chrome/Edge**: Ctrl+Shift+R (Hard Refresh)
- **Firefox**: Ctrl+F5
- **Safari**: Cmd+Shift+R

### 3. Check Port Availability
```bash
# Check if port 8081 is in use
netstat -ano | findstr :8081
# Kill process if needed
taskkill /PID <PID> /F
```

## 🔍 Root Causes

1. **Development Server Cache**: Corrupted webpack chunks
2. **Port Conflicts**: Another process using port 8081
3. **Browser Cache**: Cached chunks causing conflicts
4. **Node Modules**: Corrupted dependencies
5. **Network Issues**: Timeout loading chunks

## ✅ Prevention

1. **Regular Cache Clearing**: Clear .next directory periodically
2. **Proper Shutdown**: Always use Ctrl+C to stop dev server
3. **Browser Refresh**: Use hard refresh when seeing errors
4. **Port Management**: Use different ports for different projects

## 🚀 Quick Commands

```bash
# Quick fix (most common)
rm -rf .next && npm run dev

# Nuclear option (if above doesn't work)
rm -rf .next node_modules package-lock.json && npm install && npm run dev

# Alternative port
npm run dev -- --port 8082
```

## 📱 Testing

After applying fixes:
1. Navigate to http://localhost:8081
2. Check browser console for errors
3. Try hard refresh (Ctrl+Shift+R)
4. Test navigation between pages
5. Check if chunks load properly

## 🆘 If Error Persists

1. **Restart Computer**: Sometimes helps with port conflicts
2. **Check Antivirus**: May be blocking webpack chunks
3. **Network Issues**: Check firewall settings
4. **Node Version**: Ensure compatible Node.js version
5. **Next.js Version**: Update to latest version

## ✅ Success Indicators

- No webpack chunk errors in console
- Pages load without timeout errors
- Navigation works smoothly
- Development server starts without errors
