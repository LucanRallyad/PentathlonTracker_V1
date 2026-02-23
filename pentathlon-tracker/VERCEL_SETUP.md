# Vercel Deployment Setup Guide

## Prerequisites

- A PostgreSQL database (Vercel Postgres, Neon, Supabase, or Railway)
- A Vercel account linked to this GitHub repository

## Step 1: Create a PostgreSQL Database

### Option A: Vercel Postgres
1. Go to your Vercel project dashboard
2. Click **Storage** tab → **Create Database** → **Postgres**
3. Choose a region (e.g., `iad1` / US East)
4. Vercel auto-creates `POSTGRES_PRISMA_URL` — copy that value

### Option B: Neon (Free Tier)
1. Sign up at https://neon.tech
2. Create a new project and database
3. Copy the connection string

### Option C: Supabase
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database → Connection string (URI)

## Step 2: Set Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

| Variable | Value | Required |
|---|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string (`?sslmode=require`) | Yes |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Yes |
| `NEXTAUTH_URL` | Your Vercel URL (e.g., `https://your-app.vercel.app`) | Yes |
| `ENCRYPTION_KEY` | Generate with `openssl rand -base64 32` | Yes |
| `SUPER_ADMIN_EMAIL` | Admin email for initial seed | Optional |
| `SUPER_ADMIN_PASSWORD` | Admin password for initial seed | Optional |

## Step 3: Run Database Migrations

After setting environment variables, push your database schema:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables locally
vercel env pull .env.local

# Push schema to database (creates tables)
npx prisma db push

# Seed the database (optional — creates sample data)
npx tsx prisma/seed.ts
```

## Step 4: Deploy

Push to the linked GitHub repo, or run:

```bash
vercel --prod
```

## Troubleshooting

### "Can't reach database server"
- Verify `DATABASE_URL` is correct and includes `?sslmode=require`
- Check the database is running and accepts connections

### "relation does not exist"
- Run `npx prisma db push` to create tables

### "Prisma Client not generated"
- The build script already runs `prisma generate && next build`
- Check build logs for errors

### Build fails with type errors
- Run `npx next build` locally to reproduce
- Fix any TypeScript errors before pushing
