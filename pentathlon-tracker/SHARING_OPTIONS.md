# Ways to Share Your Project

## 1. Tunneling Services (Quick & Easy)

### ngrok (Recommended)
Creates a public HTTPS URL that tunnels to your local server.

**Install:**
```bash
brew install ngrok
# Or download from https://ngrok.com/download
```

**Usage:**
```bash
# Start your Next.js server first
npm run dev

# In another terminal, run:
ngrok http 3000
```

**Pros:**
- ✅ Free tier available
- ✅ HTTPS by default
- ✅ Works from anywhere
- ✅ No router configuration needed

**Cons:**
- ❌ Free tier has session limits
- ❌ URL changes each time (unless paid)

---

### Cloudflare Tunnel (Free & Persistent)
Free alternative with persistent URLs.

**Install:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Usage:**
```bash
# Authenticate (one-time)
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel --url http://localhost:3000
```

**Pros:**
- ✅ Completely free
- ✅ Can get persistent URLs
- ✅ Fast (uses Cloudflare's network)

---

### localtunnel (Simple & Free)
Very simple to use.

**Install:**
```bash
npm install -g localtunnel
```

**Usage:**
```bash
# Start your server first
npm run dev

# In another terminal:
lt --port 3000
```

**Pros:**
- ✅ Very simple
- ✅ Free
- ✅ No signup required

**Cons:**
- ❌ URLs can be random
- ❌ Less reliable than ngrok

---

## 2. Cloud Deployment (Permanent Solution)

### Vercel (Best for Next.js)
Made by the creators of Next.js - perfect fit!

**Setup:**
```bash
npm i -g vercel
cd pentathlon-tracker
vercel
```

**Or use GitHub integration:**
1. Push to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Deploy automatically

**Pros:**
- ✅ Free tier
- ✅ Automatic HTTPS
- ✅ Perfect Next.js integration
- ✅ Easy database integration
- ✅ Custom domains

**Environment Variables Needed:**
- `DATABASE_URL` (use Vercel Postgres or external DB)
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `NEXTAUTH_URL` (your Vercel URL)

---

### Netlify
Great alternative hosting.

**Setup:**
```bash
npm install -g netlify-cli
netlify deploy
```

**Pros:**
- ✅ Free tier
- ✅ Easy setup
- ✅ Good Next.js support

---

### Railway
Great for full-stack apps with databases.

**Setup:**
1. Go to https://railway.app
2. Connect GitHub
3. Deploy automatically

**Pros:**
- ✅ Free tier with $5 credit/month
- ✅ Built-in database options
- ✅ Easy environment variables

---

## 3. VPN Solutions

### Tailscale (Easiest VPN)
Creates a secure network between devices.

**Setup:**
1. Install Tailscale on your Mac and other devices
2. Sign in with same account
3. Access via your Tailscale IP

**Pros:**
- ✅ Free for personal use
- ✅ Very secure
- ✅ Works from anywhere
- ✅ No port forwarding needed

**Cons:**
- ❌ Requires installing software on all devices

---

### ZeroTier
Similar to Tailscale.

**Setup:**
1. Create network at https://zerotier.com
2. Install on all devices
3. Join network
4. Access via ZeroTier IP

---

## 4. SSH Port Forwarding

If you have SSH access to a server:

```bash
ssh -R 3000:localhost:3000 user@your-server.com
```

Then access via your server's IP.

---

## 5. Router Port Forwarding

**Setup:**
1. Find your router's admin panel (usually 192.168.1.1)
2. Forward external port (e.g., 8080) to your Mac's IP:3000
3. Access via your public IP:8080

**Pros:**
- ✅ Direct access
- ✅ No third-party services

**Cons:**
- ❌ Security risk (exposes your network)
- ❌ Requires static IP or DDNS
- ❌ ISP may block ports

---

## Quick Comparison

| Method | Speed | Security | Ease | Cost |
|--------|-------|----------|------|------|
| ngrok | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free/Paid |
| Cloudflare Tunnel | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free |
| Vercel | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free/Paid |
| Local Network | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Free |
| Tailscale | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free |

---

## Recommended Approach

**For Quick Testing/Demos:**
→ Use **ngrok** or **Cloudflare Tunnel**

**For Production/Staging:**
→ Deploy to **Vercel** (best Next.js integration)

**For Team Development:**
→ Use **Tailscale** VPN
