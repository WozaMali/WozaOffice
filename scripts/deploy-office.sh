#!/bin/bash

echo "🚀 Deploying Woza Mali Office App to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel first:"
    vercel login
fi

echo "📦 Building the app..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Deploying to Vercel..."
    vercel --prod
else
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "🎉 Deployment complete!"
echo "📱 Your app should be available at the URL provided above."
echo "🔧 Don't forget to set environment variables in Vercel dashboard!"
