# Production Deployment Guide

This guide will help you deploy your Pentathlon Tracker application to a public domain.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration (SQLite → PostgreSQL)](#database-migration)
3. [Environment Variables Setup](#environment-variables)
4. [Deployment Options](#deployment-options)
5. [Custom Domain Configuration](#custom-domain)
6. [Post-Deployment Steps](#post-deployment)

---

## Pre-Deployment Checklist

Before deploying, ensure:
- ✅ All code is committed to git
- ✅ Application builds successfully (`npm run build`)
- ✅ Environment variables are documented
- ✅ Database schema is ready for production
- ✅ You have a domain name (optional, but recommended)

---

## Database Migration

Your app currently uses SQLite, which won't work well in production. You need to migrate to PostgreSQL.

### Option 1: Vercel Postgres (Recommended for Vercel)

1. **Create Vercel Postgres Database:**
   - Go to your Vercel project dashboard
   - Navigate to Storage → Create Database → Postgres
   - Copy the connection string (it will be automatically added as `POSTGRES_PRISMA_URL`)

2. **Update Prisma Schema:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Railway PostgreSQL (Free Tier Available)

1. **Create Railway Account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create PostgreSQL Database:**
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Copy the `DATABASE_URL` from the Variables tab

3. **Update Prisma Schema** (same as above)

### Option 3: Supabase (Free Tier Available)

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Create a new project
   - Go to Settings → Database
   - Copy the connection string (use the "URI" format)

2. **Update Prisma Schema** (same as above)

---

## Environment Variables

You'll need to set these environment variables in your hosting platform:

### Required Variables

```bash
# Database (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="your-random-secret-here-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# Encryption Key (for sensitive data)
ENCRYPTION_KEY="your-encryption-key-min-32-chars"

# Node Environment
NODE_ENV="production"
```

### Optional Variables

```bash
# Super Admin (creates admin user on first run)
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="secure-password-here"
```

### Generating Secrets

Run these commands to generate secure random secrets:

```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32+ characters)
openssl rand -base64 32
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Why Vercel?**
- Made by Next.js creators
- Zero-config deployment
- Free tier with generous limits
- Automatic HTTPS
- Built-in Postgres support
- Custom domains included

#### Step-by-Step Deployment:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd pentathlon-tracker
   vercel
   ```
   - Follow the prompts
   - Choose your project settings
   - Vercel will detect Next.js automatically

4. **Set Environment Variables:**
   - Go to your project dashboard: https://vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add all required variables (see above)

5. **Add PostgreSQL Database:**
   - In Vercel dashboard → Storage → Create Database → Postgres
   - This automatically adds `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
   - Update your Prisma schema to use PostgreSQL
   - Set `DATABASE_URL` to `POSTGRES_PRISMA_URL` value

6. **Run Database Migrations:**
   ```bash
   # Install Vercel CLI if not already installed
   npm i -g vercel
   
   # Pull environment variables locally
   vercel env pull .env.production
   
   # Run migrations
   npx prisma migrate deploy
   ```

7. **Redeploy:**
   ```bash
   vercel --prod
   ```

#### GitHub Integration (Recommended):

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Add environment variables in the setup wizard
   - Deploy!

3. **Automatic Deployments:**
   - Every push to `main` = production deployment
   - Every push to other branches = preview deployment

---

### Option 2: Railway

**Why Railway?**
- Great for full-stack apps
- Built-in PostgreSQL
- Free tier with $5 credit/month
- Simple environment variable management

#### Step-by-Step Deployment:

1. **Create Railway Account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically creates a `DATABASE_URL` variable

4. **Set Environment Variables:**
   - Go to your service → Variables
   - Add:
     - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
     - `ENCRYPTION_KEY` (generate with `openssl rand -base64 32`)
     - `NEXTAUTH_URL` (will be your Railway URL: `https://your-app.railway.app`)
     - `NODE_ENV=production`

5. **Update Prisma Schema:**
   - Change `provider = "sqlite"` to `provider = "postgresql"`

6. **Add Build Command:**
   - In Railway dashboard → Settings → Build
   - Build Command: `npm run build`
   - Start Command: `npm start`

7. **Run Migrations:**
   - Railway provides a CLI: `npm i -g @railway/cli`
   - Connect: `railway link`
   - Run migrations: `railway run npx prisma migrate deploy`

8. **Deploy:**
   - Railway automatically deploys on git push
   - Or click "Deploy" in the dashboard

---

### Option 3: Netlify

**Why Netlify?**
- Free tier available
- Good Next.js support
- Easy setup

#### Step-by-Step Deployment:

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Create `netlify.toml`:**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

5. **Set Environment Variables:**
   - Go to Site settings → Environment variables
   - Add all required variables

**Note:** Netlify requires external PostgreSQL (use Supabase or Railway DB)

---

## Custom Domain Configuration

### Vercel Custom Domain:

1. **Add Domain:**
   - Go to Project Settings → Domains
   - Enter your domain name
   - Follow DNS configuration instructions

2. **DNS Configuration:**
   - Add a CNAME record:
     - Name: `@` or `www`
     - Value: `cname.vercel-dns.com`
   - Or add an A record (for apex domain):
     - Vercel will provide IP addresses

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - Usually takes a few minutes

### Railway Custom Domain:

1. **Add Custom Domain:**
   - Go to your service → Settings → Networking
   - Click "Add Custom Domain"
   - Enter your domain

2. **DNS Configuration:**
   - Add a CNAME record pointing to Railway's provided domain
   - Railway handles SSL automatically

---

## Post-Deployment Steps

### 1. Verify Database Connection

Check that your database is connected:
- Visit your app's admin panel
- Try creating a test competition
- Check database logs in your hosting platform

### 2. Run Database Migrations

Ensure all migrations are applied:
```bash
npx prisma migrate deploy
```

### 3. Seed Initial Data (Optional)

If you need initial data:
```bash
npx prisma db seed
```

### 4. Create Admin User

If you set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`, the admin user should be created automatically. Otherwise, create one through your app's registration flow.

### 5. Test Authentication

- Test login functionality
- Verify session management
- Check password reset (if implemented)

### 6. Monitor Logs

- **Vercel:** Dashboard → Your Project → Logs
- **Railway:** Dashboard → Your Service → Logs
- **Netlify:** Site dashboard → Functions → Logs

### 7. Set Up Monitoring (Optional)

Consider adding:
- Error tracking (Sentry, LogRocket)
- Analytics (Vercel Analytics, Google Analytics)
- Uptime monitoring (UptimeRobot, Pingdom)

---

## Troubleshooting

### Database Connection Issues

**Error: "Can't reach database server"**
- Check `DATABASE_URL` is correct
- Verify database is running
- Check firewall/network settings
- Ensure connection string uses SSL if required

**Error: "Migration failed"**
- Run `npx prisma migrate reset` (⚠️ deletes all data)
- Or manually fix migration conflicts
- Check Prisma schema matches database

### Build Failures

**Error: "Module not found"**
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check for TypeScript errors

**Error: "Environment variable missing"**
- Verify all required env vars are set
- Check variable names match exactly
- Redeploy after adding variables

### Authentication Issues

**Error: "NEXTAUTH_SECRET missing"**
- Generate a new secret: `openssl rand -base64 32`
- Add to environment variables
- Redeploy

**Error: "Invalid NEXTAUTH_URL"**
- Set `NEXTAUTH_URL` to your production domain
- Must include `https://`
- No trailing slash

---

## Quick Start Commands

### Vercel Quick Deploy:
```bash
npm i -g vercel
cd pentathlon-tracker
vercel login
vercel
# Add env vars in dashboard
vercel --prod
```

### Railway Quick Deploy:
```bash
# Push to GitHub, then:
# 1. Go to railway.app
# 2. New Project → GitHub repo
# 3. Add PostgreSQL database
# 4. Set environment variables
# 5. Deploy!
```

---

## Cost Estimates

### Free Tier Options:
- **Vercel:** Free tier includes 100GB bandwidth/month, unlimited deployments
- **Railway:** $5 free credit/month (usually enough for small apps)
- **Supabase:** Free tier includes 500MB database, 2GB bandwidth
- **Netlify:** Free tier includes 100GB bandwidth/month

### Paid Options (if you outgrow free tier):
- **Vercel Pro:** $20/month
- **Railway:** Pay-as-you-go (~$5-20/month for small apps)
- **Supabase Pro:** $25/month

---

## Security Checklist

Before going live:
- ✅ All environment variables are set
- ✅ `NEXTAUTH_SECRET` is strong and unique
- ✅ `ENCRYPTION_KEY` is strong and unique
- ✅ Database uses SSL connections
- ✅ HTTPS is enabled (automatic on Vercel/Railway)
- ✅ Admin passwords are strong
- ✅ CORS is properly configured
- ✅ Rate limiting is in place (if applicable)

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Prisma Deployment:** https://www.prisma.io/docs/guides/deployment

---

**Ready to deploy?** Choose your platform above and follow the step-by-step instructions!
