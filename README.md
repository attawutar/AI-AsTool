# 🤖 AI AsTool - Web Event Helper

Real-time group randomizer built with **React + Tailwind + Socket.io**.  
Participants join from their phones — the host sees them instantly.

---

## 🚀 Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Run backend + frontend together
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

Open two browser windows (or use your phone on the same WiFi) to test both Host and Participant flows.

---

## 🌐 Deploy to Railway (Free — works across devices/phones)

Railway gives you a public URL so anyone can join from their phone.

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Railway auto-detects Node.js and runs `npm start`
4. After deploy, copy your Railway URL (e.g. `https://hello-ai-production.up.railway.app`)
5. Create a `.env` file:
   ```
   VITE_SOCKET_URL=https://hello-ai-production.up.railway.app
   ```
6. Run `npm run build` then push the `dist/` folder, or set up Railway to build+serve

### One-command deploy (Railway CLI)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 📦 Alternative: Deploy to Render (also free)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Done — Render gives you a public HTTPS URL

---

## 🏗 Architecture

```
Browser (Host)          Server (Node.js + Socket.io)         Browser (Participant)
     │                           │                                    │
     │── create-room ──────────► │                                    │
     │◄── room-created ──────────│                                    │
     │                           │◄── join-room ──────────────────────│
     │◄── room-update ───────────│─── room-update ────────────────────►│
     │── randomize-groups ──────►│                                    │
     │◄── groups-randomized ─────│─── groups-randomized ──────────────►│
```

- **In-memory store** — rooms live on the server while active (no database needed)
- **Auto cleanup** — rooms expire after 2 hours
- **QR codes** via [qrserver.com](https://qrserver.com) (free, no API key)

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Set to `production` to serve built frontend |
| `VITE_SOCKET_URL` | auto-detected | Socket.io server URL (set for production) |

---

## 🎨 Tech Stack

- **Frontend**: React 18, Tailwind CSS 3, Vite 5
- **Backend**: Express, Socket.io 4
- **Realtime**: WebSocket (with polling fallback)
- **QR**: qrserver.com free API
"# HelloAiRandomGroup" 
