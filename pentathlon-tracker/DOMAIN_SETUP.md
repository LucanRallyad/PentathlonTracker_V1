# Domain Setup Guide for lucanmarsh.com

This guide will help you configure your domain `lucanmarsh.com` for your Pentathlon Tracker application.

## Domain Configuration Options

### Option 1: Root Domain (lucanmarsh.com)
- Users access: `https://lucanmarsh.com`
- Requires A record configuration

### Option 2: Subdomain (recommended)
- Users access: `https://pentathlon.lucanmarsh.com` or `https://tracker.lucanmarsh.com`
- Easier to configure with CNAME
- Allows you to host other services on the same domain

**Recommendation:** Use a subdomain like `pentathlon.lucanmarsh.com` or `tracker.lucanmarsh.com`

---

## Platform-Specific Setup

### Vercel (Recommended)

#### Step 1: Deploy to Vercel
1. Deploy your app to Vercel (follow DEPLOYMENT_GUIDE.md)
2. Note your Vercel URL: `your-app.vercel.app`

#### Step 2: Add Custom Domain in Vercel
1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Domains**
3. Enter your domain:
   - For subdomain: `pentathlon.lucanmarsh.com`
   - For root domain: `lucanmarsh.com`
4. Click **Add**

#### Step 3: Configure DNS Records

**For Subdomain (pentathlon.lucanmarsh.com):**
```
Type: CNAME
Name: pentathlon (or tracker, or whatever subdomain you choose)
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

**For Root Domain (lucanmarsh.com):**
Vercel will provide you with specific A records. Typically:
```
Type: A
Name: @
Value: 76.76.21.21 (Vercel will provide the actual IPs)
TTL: 3600

Type: A
Name: @
Value: 76.223.126.88 (Vercel will provide the actual IPs)
TTL: 3600
```

#### Step 4: Update Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
NEXTAUTH_URL=https://pentathlon.lucanmarsh.com
```
(Or `https://lucanmarsh.com` if using root domain)

#### Step 5: SSL Certificate
- Vercel automatically provisions SSL certificates
- Usually takes 5-60 minutes after DNS propagation
- You'll see "Valid Configuration" when ready

---

### Railway

#### Step 1: Deploy to Railway
1. Deploy your app to Railway (follow DEPLOYMENT_GUIDE.md)
2. Note your Railway URL: `your-app.railway.app`

#### Step 2: Add Custom Domain
1. Go to your Railway project dashboard
2. Click on your service → **Settings** → **Networking**
3. Under **Custom Domains**, click **Add Custom Domain**
4. Enter: `pentathlon.lucanmarsh.com` (or your preferred subdomain)

#### Step 3: Configure DNS Records
Railway will provide you with a CNAME target:
```
Type: CNAME
Name: pentathlon (or your subdomain)
Value: [Railway-provided CNAME target]
TTL: 3600
```

#### Step 4: Update Environment Variables
In Railway dashboard → Variables:
```
NEXTAUTH_URL=https://pentathlon.lucanmarsh.com
```

#### Step 5: SSL Certificate
- Railway uses Let's Encrypt
- SSL is automatically configured
- Takes a few minutes after DNS propagation

---

### Netlify

#### Step 1: Deploy to Netlify
1. Deploy your app to Netlify
2. Note your Netlify URL: `your-app.netlify.app`

#### Step 2: Add Custom Domain
1. Go to Site settings → **Domain management**
2. Click **Add custom domain**
3. Enter: `pentathlon.lucanmarsh.com`

#### Step 3: Configure DNS Records
Netlify will provide DNS instructions:
```
Type: CNAME
Name: pentathlon
Value: [Netlify-provided CNAME]
TTL: 3600
```

#### Step 4: Update Environment Variables
In Netlify dashboard → Site settings → Environment variables:
```
NEXTAUTH_URL=https://pentathlon.lucanmarsh.com
```

---

## DNS Configuration Steps

### Where to Configure DNS

Your DNS is managed by your domain registrar (where you bought lucanmarsh.com). Common registrars:
- GoDaddy
- Namecheap
- Google Domains
- Cloudflare
- AWS Route 53

### General DNS Setup Process

1. **Log into your domain registrar**
   - Go to your account dashboard
   - Find "DNS Management" or "Domain Settings"

2. **Add the DNS record** (CNAME for subdomain, A records for root)
   - Use the values provided by your hosting platform (Vercel/Railway/Netlify)

3. **Wait for DNS propagation**
   - Usually takes 5 minutes to 48 hours
   - Typically resolves within 1-2 hours
   - Check with: `dig pentathlon.lucanmarsh.com` or `nslookup pentathlon.lucanmarsh.com`

4. **Verify SSL certificate**
   - Your hosting platform will automatically provision SSL
   - Check status in platform dashboard

---

## Recommended Setup

### For lucanmarsh.com:

**Best Practice:**
- Use subdomain: `pentathlon.lucanmarsh.com` or `tracker.lucanmarsh.com`
- Keep root domain (`lucanmarsh.com`) for your main website/portfolio
- Easier DNS configuration with CNAME

**DNS Records Needed:**
```
pentathlon.lucanmarsh.com → CNAME → [Platform CNAME target]
```

**Environment Variable:**
```
NEXTAUTH_URL=https://pentathlon.lucanmarsh.com
```

---

## Testing Your Domain

### 1. Check DNS Propagation
```bash
# Check if DNS is resolving
nslookup pentathlon.lucanmarsh.com
# or
dig pentathlon.lucanmarsh.com
```

### 2. Test HTTPS
```bash
# Check SSL certificate
curl -I https://pentathlon.lucanmarsh.com
```

### 3. Verify in Browser
- Visit `https://pentathlon.lucanmarsh.com`
- Check browser shows padlock icon (SSL working)
- Test login functionality

---

## Troubleshooting

### DNS Not Resolving
- **Wait longer:** DNS can take up to 48 hours (usually much faster)
- **Check DNS records:** Ensure CNAME/A records are correct
- **Check TTL:** Lower TTL (300 seconds) for faster updates during setup

### SSL Certificate Not Issuing
- **Wait:** SSL provisioning can take 5-60 minutes
- **Check DNS:** SSL won't issue until DNS is fully propagated
- **Verify domain:** Ensure domain is correctly added in platform dashboard

### Domain Shows "Invalid Configuration"
- **Check DNS records:** Ensure they match platform requirements exactly
- **Wait for propagation:** DNS changes need time to propagate
- **Remove and re-add:** Sometimes removing and re-adding domain helps

### Redirect Issues
- **Check NEXTAUTH_URL:** Must match your domain exactly
- **Check platform redirects:** Some platforms have redirect settings
- **Clear cache:** Browser cache can cause issues

---

## Quick Checklist

- [ ] Domain added in hosting platform (Vercel/Railway/Netlify)
- [ ] DNS records configured at domain registrar
- [ ] DNS propagated (check with nslookup/dig)
- [ ] SSL certificate issued (check platform dashboard)
- [ ] `NEXTAUTH_URL` environment variable set correctly
- [ ] Application accessible via custom domain
- [ ] HTTPS working (padlock icon in browser)
- [ ] Login/authentication working correctly

---

## Next Steps After Domain Setup

1. **Update any hardcoded URLs** in your code (if any)
2. **Test all functionality** on the new domain
3. **Set up monitoring** (optional but recommended)
4. **Configure email** (if your app sends emails, update sender domain)

---

## Need Help?

- **Vercel Domain Docs:** https://vercel.com/docs/concepts/projects/domains
- **Railway Domain Docs:** https://docs.railway.app/networking/custom-domains
- **Netlify Domain Docs:** https://docs.netlify.com/domains-https/custom-domains/

Your domain `lucanmarsh.com` is ready to be configured! Choose your preferred subdomain and follow the platform-specific instructions above.
