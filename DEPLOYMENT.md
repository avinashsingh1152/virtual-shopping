# Deployment Guide - Virtual Shopping Platform

## 🚀 Quick Deploy

This guide covers deploying your Virtual Shopping platform with:
- **Frontend**: Vercel (React + Vite + Three.js)
- **Backend**: Render.com (Node.js + Socket.io + WebRTC)

---

## 📋 Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Render Account** - Sign up at [render.com](https://render.com)
4. **Environment Variables** - Have your API keys ready

---

## 🎯 Part 1: Deploy Backend to Render

### Step 1: Push Code to GitHub

```bash
cd c:\Projects\seller-agent\virtual-shopping
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/virtual-shopping.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `virtual-shopping-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (or paid for better performance)

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=3001
REDIS_URL=<leave-empty-for-in-memory-mode>
OPENAI_API_KEY=<your-openai-api-key>
```

### Step 4: Deploy

- Click **"Create Web Service"**
- Wait for deployment (5-10 minutes)
- Copy your backend URL: `https://virtual-shopping-backend.onrender.com`

---

## 🌐 Part 2: Deploy Frontend to Vercel

### Step 1: Update Environment Variables

Edit `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://virtual-shopping-backend.onrender.com
```

### Step 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy frontend
cd frontend
vercel --prod
```

**OR** Deploy via Vercel Dashboard:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://virtual-shopping-backend.onrender.com`
5. Click **"Deploy"**

### Step 3: Get Your URL

- Your frontend will be live at: `https://virtual-shopping-frontend.vercel.app`

---

## 🔧 Part 3: Update Backend CORS

After deployment, update your backend CORS settings to allow your Vercel domain.

Edit `backend/src/server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://virtual-shopping-frontend.vercel.app',
    'https://*.vercel.app' // Allow all Vercel preview deployments
  ],
  credentials: true
}));
```

Commit and push changes - Render will auto-deploy.

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend loads: `https://your-frontend.vercel.app`
- [ ] API connection works (check browser console)
- [ ] WebSocket/Socket.io connects (check Network tab)
- [ ] Video calls work (test with 2 browser tabs)
- [ ] 3D environment renders correctly

---

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` in Vercel environment variables
- Verify CORS settings in backend
- Check browser console for errors

### Video calls not working
- Ensure backend is on Render (not Vercel serverless)
- Check WebSocket connection in Network tab
- Verify STUN/TURN server configuration

### Backend crashes on Render
- Check Render logs: Dashboard → Your Service → Logs
- Verify all environment variables are set
- Check for missing dependencies in `package.json`

### Slow performance
- Upgrade Render instance from Free to Starter ($7/month)
- Enable Redis for better performance
- Optimize 3D assets and textures

---

## 💰 Cost Estimate

- **Vercel Frontend**: Free (Hobby plan)
- **Render Backend**: 
  - Free tier: $0 (sleeps after 15 min inactivity)
  - Starter: $7/month (always on)
- **Redis** (optional): $10-20/month

**Total**: $0-$27/month

---

## 🔄 Continuous Deployment

Both Vercel and Render support auto-deployment:

1. Push to `main` branch
2. Vercel auto-deploys frontend
3. Render auto-deploys backend
4. Changes live in ~5 minutes

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Socket.io Deployment](https://socket.io/docs/v4/server-deployment/)

---

## 🆘 Need Help?

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel deployment logs
3. Verify environment variables are set correctly
4. Test locally first: `npm run dev` (frontend) and `npm start` (backend)
