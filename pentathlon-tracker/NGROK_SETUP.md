# ngrok Setup Guide

## Step 1: Sign Up for ngrok (Free)

1. Go to https://dashboard.ngrok.com/signup
2. Sign up with your email (it's free!)
3. Verify your email address

## Step 2: Get Your Authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (it looks like: `2abc123def456ghi789jkl012mno345pq_6rStUvWxYzAbCdEfGhIjKlMn`)

## Step 3: Configure ngrok

Run this command in your terminal (replace YOUR_TOKEN with your actual token):

```bash
ngrok config add-authtoken YOUR_TOKEN
```

## Step 4: Start ngrok

Make sure your Next.js server is running first:

```bash
# Terminal 1: Start your server
cd pentathlon-tracker
npm run dev
```

Then in another terminal:

```bash
# Terminal 2: Start ngrok tunnel
ngrok http 3000
```

## Step 5: Share Your URL

ngrok will display something like:

```
Forwarding   https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Share the HTTPS URL** (the one starting with `https://`) with anyone you want to access your site!

## Tips

- **Free tier**: URLs change each time you restart ngrok (unless you pay for a static domain)
- **Web Interface**: Visit http://localhost:4040 to see request logs and tunnel info
- **To stop**: Press `Ctrl+C` in the ngrok terminal

## Quick Start Script

Once configured, you can create a simple script to start both:

```bash
# Start server and ngrok together
npm run dev & ngrok http 3000
```
