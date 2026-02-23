# Quick Deploy Guide

Choose your deployment method based on your needs:

## 🚀 Fastest: Vercel (Recommended)

**Best for:** Next.js apps, quick deployment, free tier

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd pentathlon-tracker
vercel

# 4. Add PostgreSQL database in Vercel dashboard
# 5. Set environment variables in dashboard
# 6. Run migrations: vercel env pull && npx prisma migrate deploy
# 7. Deploy to production: vercel --prod
```

**Time:** ~10 minutes  
**Cost:** Free tier available  
**Domain:** Free `.vercel.app` domain included  
**Custom Domain:** Configure `pentathlon.lucanmarsh.com` - see [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

---

## 🚂 Alternative: Railway

**Best for:** Full-stack apps, built-in PostgreSQL

1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub repo
4. Add PostgreSQL database
5. Set environment variables
6. Deploy!

**Time:** ~15 minutes  
**Cost:** $5 free credit/month  
**Domain:** Free `.railway.app` domain included

---

## 🌐 Alternative: Netlify

**Best for:** Static sites, JAMstack apps

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**Time:** ~15 minutes  
**Cost:** Free tier available  
**Note:** Requires external PostgreSQL (use Supabase)

---

## 📋 What You Need Before Deploying

1. **PostgreSQL Database** (choose one):
   - Vercel Postgres (if using Vercel)
   - Railway PostgreSQL (if using Railway)
   - Supabase (free tier available)

2. **Environment Variables:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate: `openssl rand -base64 32`
   - `ENCRYPTION_KEY` - Generate: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your production URL (e.g., `https://pentathlon.lucanmarsh.com`)
   - `NODE_ENV=production`

3. **Update Prisma Schema:**
   - Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`

---

## 🎯 Recommended Path

**For most users:** Use **Vercel** - it's made by Next.js creators and has the best integration.

**Steps:**
1. Push code to GitHub
2. Sign up at vercel.com
3. Import GitHub repository
4. Add PostgreSQL database in Vercel dashboard
5. Set environment variables (including `NEXTAUTH_URL`)
6. Add custom domain `pentathlon.lucanmarsh.com` (see [DOMAIN_SETUP.md](./DOMAIN_SETUP.md))
7. Deploy!

**Full guide:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## ⚡ Quick Test Before Deploying

```bash
# Test build locally
npm run build
npm start

# If this works, you're ready to deploy!
```

---

## 🆘 Need Help?

- **Detailed Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Domain Setup:** [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) - Configure `lucanmarsh.com`
- **Checklist:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Database Migration:** [scripts/migrate-to-postgres.md](./scripts/migrate-to-postgres.md)
