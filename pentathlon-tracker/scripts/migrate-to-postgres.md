# Migrating from SQLite to PostgreSQL

This guide helps you migrate your database from SQLite to PostgreSQL for production deployment.

## Step 1: Backup Your SQLite Database

```bash
# Copy your current database
cp prisma/dev.db prisma/dev.db.backup
```

## Step 2: Update Prisma Schema

Change the datasource in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

## Step 3: Get PostgreSQL Connection String

### Option A: Vercel Postgres
- Go to Vercel Dashboard → Storage → Create Postgres
- Copy `POSTGRES_PRISMA_URL` (use this as `DATABASE_URL`)

### Option B: Railway PostgreSQL
- Create PostgreSQL in Railway
- Copy `DATABASE_URL` from Variables tab

### Option C: Supabase
- Create project at supabase.com
- Go to Settings → Database
- Copy connection string (URI format)

## Step 4: Set Environment Variable

```bash
# Create .env.production file
echo 'DATABASE_URL="your-postgresql-connection-string"' > .env.production
```

## Step 5: Generate Prisma Client

```bash
npx prisma generate
```

## Step 6: Run Migrations

```bash
# Create initial migration
npx prisma migrate dev --name init_postgres

# Or if deploying to production:
npx prisma migrate deploy
```

## Step 7: Verify Migration

```bash
# Open Prisma Studio to verify data
npx prisma studio
```

## Step 8: Seed Database (if needed)

```bash
npx prisma db seed
```

## Important Notes

⚠️ **Data Migration:** If you have existing SQLite data, you'll need to export and import it:
1. Export from SQLite: `sqlite3 dev.db .dump > backup.sql`
2. Convert SQL syntax for PostgreSQL
3. Import to PostgreSQL (this may require manual conversion)

For a fresh start, just run migrations - no data export needed.

## Troubleshooting

**Error: "relation does not exist"**
- Run `npx prisma migrate deploy` to create tables

**Error: "connection refused"**
- Check your `DATABASE_URL` is correct
- Verify database is running and accessible
- Check firewall/network settings

**Error: "SSL required"**
- Add `?sslmode=require` to your connection string
- Or use `?sslmode=no-verify` for development (not recommended for production)
