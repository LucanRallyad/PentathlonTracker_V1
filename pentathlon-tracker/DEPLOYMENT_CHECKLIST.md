# Quick Deployment Checklist

Use this checklist to ensure you're ready for production deployment.

## Pre-Deployment

- [ ] Code is committed to git
- [ ] Application builds successfully (`npm run build`)
- [ ] All tests pass (if you have tests)
- [ ] Environment variables are documented
- [ ] `.env.production.example` file is created

## Database Setup

- [ ] PostgreSQL database is created (Vercel/Railway/Supabase)
- [ ] `DATABASE_URL` connection string is obtained
- [ ] Prisma schema updated to use `postgresql` provider
- [ ] Database migrations are ready
- [ ] Backup of SQLite data (if migrating existing data)

## Environment Variables

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Generated secure secret (32+ chars)
- [ ] `ENCRYPTION_KEY` - Generated secure key (32+ chars)
- [ ] `NEXTAUTH_URL` - Your production domain URL
- [ ] `NODE_ENV=production`
- [ ] `SUPER_ADMIN_EMAIL` (optional)
- [ ] `SUPER_ADMIN_PASSWORD` (optional)

## Platform Setup

### If using Vercel:
- [ ] Vercel account created
- [ ] Project connected to GitHub (or CLI deployed)
- [ ] Environment variables added in dashboard
- [ ] PostgreSQL database added via Vercel Storage
- [ ] Custom domain configured (if applicable)

### If using Railway:
- [ ] Railway account created
- [ ] Project created and connected to GitHub
- [ ] PostgreSQL database provisioned
- [ ] Environment variables set
- [ ] Build/start commands configured
- [ ] Custom domain configured (if applicable)

### If using Netlify:
- [ ] Netlify account created
- [ ] Site created and connected to GitHub
- [ ] `netlify.toml` configured
- [ ] Environment variables set
- [ ] External PostgreSQL database configured
- [ ] Custom domain configured (if applicable)

## Post-Deployment

- [ ] Database migrations run successfully
- [ ] Application is accessible via public URL
- [ ] Admin user can log in
- [ ] Database connection verified
- [ ] Authentication working correctly
- [ ] HTTPS/SSL certificate active
- [ ] Custom domain working (if configured)
- [ ] Error logging/monitoring set up (optional)

## Security

- [ ] All secrets are strong and unique
- [ ] Database uses SSL connections
- [ ] HTTPS is enabled
- [ ] Admin passwords are secure
- [ ] No sensitive data in git repository
- [ ] `.env` files are in `.gitignore`

## Testing

- [ ] Can create a competition
- [ ] Can add athletes
- [ ] Can enter scores
- [ ] Can view results/leaderboard
- [ ] User authentication works
- [ ] Role-based access control works
- [ ] Public pages are accessible

## Monitoring (Optional but Recommended)

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics set up (if needed)
- [ ] Uptime monitoring configured
- [ ] Log aggregation set up

---

## Quick Commands Reference

```bash
# Generate secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY

# Build locally to test
npm run build
npm start

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Check database connection
npx prisma studio
```

---

**Ready?** Follow the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions!
