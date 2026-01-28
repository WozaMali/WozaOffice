# 🚀 Deploying Woza Mali Office App to Vercel

Write-Host "🚀 Deploying Woza Mali Office App to Vercel..." -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Check if user is logged in
try {
    $whoami = vercel whoami
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please login to Vercel first:" -ForegroundColor Yellow
    vercel login
}

Write-Host "📦 Building the app..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful! Deploying to Vercel..." -ForegroundColor Green
    vercel --prod
} else {
    Write-Host "❌ Build failed. Please fix the errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "📱 Your app should be available at the URL provided above." -ForegroundColor Blue
Write-Host "🔧 Don't forget to set environment variables in Vercel dashboard!" -ForegroundColor Yellow
