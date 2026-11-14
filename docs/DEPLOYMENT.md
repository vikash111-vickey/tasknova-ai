# TASKNOVA AI — Fast Turnkey Deployment Guide

TASKNOVA is production-ready for instant deployment. Because the Node.js server automatically serves the compiled React single-page application in production, you can deploy the entire full-stack platform as a **single unified service** or split into frontend/backend.

---

## ⚡ Option 1: Fast 1-Service Deployment (Railway / Render / Fly.io) — Recommended

Both the backend Express API and the Vite React frontend run together on a single port.

### On Railway / Render:
1. Push your repository to GitHub.
2. Link your repository in [Railway](https://railway.app) or [Render](https://render.com).
3. Set the build and start commands:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
4. Set the Environment Variables:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=generate-a-secure-random-secret

   # Supabase Connection (Required for Live Multi-User DB)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # Optional AI Model Keys
   GEMINI_API_KEY=your-gemini-key
   OPENAI_API_KEY=your-openai-key
   ```
5. Click **Deploy**. The platform will be live on your custom HTTPS domain!

---

## 🐳 Option 2: Docker Deployment

The repository includes an optimized multi-stage [`Dockerfile`](../Dockerfile) (`node:20-alpine`).

1. Build the Docker container:
   ```bash
   docker build -t tasknova-ai:latest .
   ```
2. Run the container:
   ```bash
   docker run -d \
     -p 3001:3001 \
     -e NODE_ENV=production \
     -e JWT_SECRET=tasknova-production-secret \
     -e SUPABASE_URL=https://your-project.supabase.co \
     -e SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key \
     --name tasknova-ai \
     tasknova-ai:latest
   ```
3. Open `http://localhost:3001` in your browser.

---

## 🌐 Option 3: Split Deployment (Vercel Frontend + Render Backend)

If you prefer deploying the frontend separately to Vercel:
1. **Deploy Backend**: Deploy `server/` to Render or Railway with start command `npm run start --workspace=server`.
2. **Deploy Frontend**:
   - In Vercel, set Root Directory to `client`.
   - Set Build Command to `npm run build`.
   - Set Output Directory to `dist`.
   - Add environment variable `VITE_API_URL=https://your-backend.onrender.com`.

---

## 🔑 AI Chatbox Engine Setup

1. On the live platform, go to `/dashboard`.
2. Click the **Model: [ENGINE]** badge directly on the command bar.
3. Select **Gemini** (Google DeepMind) or **OpenAI** (GPT-4o), paste your API key, and click **Save & Connect Engine**.
4. The system immediately connects to live LLM planning.
