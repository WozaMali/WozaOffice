# 🚀 Quick Deploy to Vercel

## ⚡ Fast Track Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy Office App
```bash
# In the main directory
vercel --prod
```

### 4. Deploy Collector App
```bash
# In the collector-app directory
cd collector-app
vercel --prod
```

## 🔑 Environment Variables to Set

After each deployment, set these in Vercel Dashboard:

### Office App
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Collector App
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🌐 Custom Domains

1. **Office App**: `office.yourdomain.com`
2. **Collector App**: `collector.yourdomain.com`

## 📱 Your Apps Will Be Available At

- **Office**: `https://woza-mali-office.vercel.app`
- **Collector**: `https://woza-mali-collector.vercel.app`

## 🎯 Next Steps

1. Set environment variables in Vercel
2. Configure custom domains
3. Test all functionality
4. Set up automatic deployments

---

**Need help? Check `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions!**
