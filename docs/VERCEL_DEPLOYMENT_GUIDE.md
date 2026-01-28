# 🚀 Vercel Deployment Guide for Woza Mali Apps

This guide will help you deploy both the **Office App** and **Collector App** to separate subdomains on Vercel.

## 📋 Prerequisites

- [Vercel Account](https://vercel.com/signup) (free tier available)
- [GitHub Account](https://github.com) (or GitLab/Bitbucket)
- Both apps successfully building locally
- Supabase project with proper environment variables

## 🔧 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## 🔐 Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

## 🏢 Step 3: Deploy Office App

### 3.1 Navigate to Office App Directory
```bash
cd WozaMaliOffice
```

### 3.2 Deploy to Vercel
```bash
vercel --prod
```

**During deployment, you'll be asked:**
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N` (create new)
- **Project name:** → `woza-mali-office`
- **In which directory is your code located?** → `./` (current directory)
- **Want to override the settings?** → `Y`
- **Build Command:** → `npm run build`
- **Output Directory:** → `.next`
- **Install Command:** → `npm install`
- **Development Command:** → `npm run dev`

### 3.3 Set Environment Variables
After deployment, set these environment variables in Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

**Values to enter:**
- `NEXT_PUBLIC_SUPABASE_URL`: `https://mljtjntkddwkcjixkyuy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key from `.env`
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key from `.env`
- `GOOGLE_CLIENT_ID`: Your Google client ID from `.env`
- `GOOGLE_CLIENT_SECRET`: Your Google client secret from `.env`

### 3.4 Redeploy with Environment Variables
```bash
vercel --prod
```

## 📱 Step 4: Deploy Collector App

### 4.1 Navigate to Collector App Directory
```bash
cd collector-app
```

### 4.2 Deploy to Vercel
```bash
vercel --prod
```

**During deployment, you'll be asked:**
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N` (create new)
- **Project name:** → `woza-mali-collector`
- **In which directory is your code located?** → `./` (current directory)
- **Want to override the settings?** → `Y`
- **Build Command:** → `npm run build`
- **Output Directory:** → `.next`
- **Install Command:** → `npm install`
- **Development Command:** → `npm run dev`

### 4.3 Set Environment Variables
After deployment, set these environment variables in Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

**Values to enter:**
- `NEXT_PUBLIC_SUPABASE_URL`: `https://mljtjntkddwkcjixkyuy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key from `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key from `.env.local`

### 4.4 Redeploy with Environment Variables
```bash
vercel --prod
```

## 🌐 Step 5: Configure Custom Domains

### 5.1 Office App Domain
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `woza-mali-office` project
3. Go to **Settings** → **Domains**
4. Add custom domain: `office.yourdomain.com` (replace with your actual domain)
5. Follow DNS configuration instructions

### 5.2 Collector App Domain
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `woza-mali-collector` project
3. Go to **Settings** → **Domains**
4. Add custom domain: `collector.yourdomain.com` (replace with your actual domain)
5. Follow DNS configuration instructions

## 🔄 Step 6: Set Up Automatic Deployments

### 6.1 Connect GitHub Repository
1. In Vercel Dashboard, go to **Settings** → **Git**
2. Connect your GitHub repository
3. Configure deployment settings:
   - **Production Branch:** `main` or `master`
   - **Auto-deploy:** `Enabled`
   - **Preview Deployments:** `Enabled`

### 6.2 Environment Variables for Production
Make sure all environment variables are set for **Production** environment in Vercel.

## 🧪 Step 7: Test Deployments

### 7.1 Test Office App
- Visit your office app URL
- Test admin login functionality
- Verify Supabase connection
- Check admin dashboard features

### 7.2 Test Collector App
- Visit your collector app URL
- Test collector login functionality
- Verify pickup creation
- Check real-time updates

## 🚨 Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors
- Verify environment variables are set

### Environment Variable Issues
- Double-check variable names (case-sensitive)
- Ensure variables are set for Production environment
- Redeploy after setting environment variables

### Domain Issues
- Verify DNS configuration
- Check SSL certificate status
- Ensure domain is properly linked to Vercel project

## 📊 Monitoring

### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Monitor build times and deployment success rates
- Set up alerts for failed deployments

### Supabase Monitoring
- Monitor database performance
- Check real-time subscription status
- Review authentication logs

## 🔒 Security Considerations

### Environment Variables
- Never commit sensitive keys to Git
- Use Vercel's environment variable encryption
- Rotate keys regularly

### CORS Configuration
- Configure Supabase CORS settings for your domains
- Restrict access to authorized domains only

## 📱 Mobile Optimization

### PWA Features
- Both apps are optimized for mobile
- Test on various devices and screen sizes
- Verify touch interactions work properly

## 🎯 Next Steps

After successful deployment:
1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure backup and recovery procedures
4. Document deployment procedures for team
5. Set up staging environment if needed

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Supabase connection status
3. Verify environment variables
4. Check browser console for errors
5. Review Vercel and Supabase documentation

---

**Happy Deploying! 🚀**
