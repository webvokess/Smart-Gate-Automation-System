# ⚓ Smart Gate Automation System (SGAS)
### Deendayal Port Authority × IIT Madras — Full-Stack Production System

---

## 📋 Quick Start (TL;DR)

```bash
# 1. Copy .env files
cp backend/.env.example backend/.env   # then edit MONGODB_URI

# 2. Install and seed
cd backend && npm install && npm run seed

# 3. Start backend (Terminal 1)
npm run dev

# 4. Start frontend (Terminal 2)
cd ../frontend && npm install && npm run dev

# 5. Open browser → http://localhost:5173
# Login: admin@dpa.gov.in / Admin@123
```

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER — React 18 + Vite (port 5173)                              │
│                                                                     │
│   Login ──→ JWT stored in localStorage                              │
│   Axios interceptor adds: Authorization: Bearer <token>             │
│   Vite proxy: /api  →  localhost:5000    (no CORS issues in dev)    │
│   Socket.IO client   →  localhost:5000   (real-time events)         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ HTTP REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND — Node.js + Express (port 5000)                            │
│                                                                     │
│  Middleware stack (every request):                                  │
│    helmet → cors → rateLimit → bodyParser → morgan → req.io attach  │
│                                                                     │
│  Routes → Controllers → Models                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/v1/auth          JWT login, register, me               │   │
│  │  /api/v1/vehicles      CRUD + VAHAN mock + bulk upload       │   │
│  │  /api/v1/drivers       CRUD + approve + bulk upload          │   │
│  │  /api/v1/permits       State machine + QR generation         │   │
│  │  /api/v1/gate          Entry/Exit queue + authorization      │   │
│  │  /api/v1/weighbridge   Tare + Gross recording + validation   │   │
│  │  /api/v1/dashboard     Aggregated stats + charts data        │   │
│  │  /api/v1/reports       Daily permit report                   │   │
│  │  /api/v1/audit         Full action audit log (Admin only)    │   │
│  │  /api/v1/upload        File upload (Cloudinary)              │   │
│  │  /health               Health check endpoint                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Socket.IO Server — emits to ALL connected clients:                 │
│    permit_created  permit_updated  gate_entry                       │
│    gate_exit       weight_updated  permit_alert                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MongoDB (Atlas Cloud OR Local)                                     │
│                                                                     │
│  Collections:                                                       │
│    users          → auth, roles, lastLogin                          │
│    vehicles       → plate, VAHAN status, soft-delete               │
│    drivers        → license, biometric status, approval             │
│    permits        → full stage machine, weights, QR, alerts         │
│    auditlogs      → every state change with userId + timestamp      │
│    notifications  → real-time alert storage                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Complete Project Structure

```
sgas/
├── README.md                          ← You are here
│
├── backend/
│   ├── server.js                      ← Express + Socket.IO entry point
│   ├── .env                           ← YOUR secrets (fill this in!)
│   ├── .env.example                   ← Template showing all variables
│   ├── package.json
│   │
│   ├── config/
│   │   └── db.js                      ← MongoDB connection with retry
│   │
│   ├── models/
│   │   └── index.js                   ← All 6 Mongoose schemas + indexes
│   │       ├── User     (JWT auth + RBAC roles)
│   │       ├── Vehicle  (plate, VAHAN status, soft-delete)
│   │       ├── Driver   (license, biometric, approval workflow)
│   │       ├── Permit   (STATE MACHINE + weights + QR + alerts)
│   │       ├── AuditLog (every action logged)
│   │       └── Notification
│   │
│   ├── controllers/
│   │   ├── authController.js          ← login, register, getMe
│   │   ├── permitController.js        ← create, list, transition, QR
│   │   ├── vehicleController.js       ← CRUD, VAHAN mock, bulk import
│   │   ├── driverController.js        ← CRUD, approve, bulk import
│   │   ├── weighbridgeController.js   ← tare/gross record + validation
│   │   └── dashboardController.js     ← MongoDB aggregations for charts
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── vehicles.js
│   │   ├── drivers.js
│   │   ├── permits.js
│   │   ├── gate.js
│   │   ├── weighbridge.js
│   │   ├── dashboard.js
│   │   ├── reports.js
│   │   ├── audit.js
│   │   └── upload.js
│   │
│   ├── middleware/
│   │   ├── auth.js                    ← protect() + authorize(...roles)
│   │   └── audit.js                   ← auto-log actions to AuditLog
│   │
│   └── utils/
│       ├── seed.js                    ← 25 vehicles, 25 drivers, 30 permits
│       ├── logger.js                  ← Winston (console + file)
│       └── socket.js                 ← Socket.IO init + getIO()
│
└── frontend/
    ├── index.html
    ├── vite.config.js                 ← Proxy /api → :5000 (dev only)
    ├── .env                           ← VITE_API_URL + VITE_SOCKET_URL
    ├── .env.example
    ├── package.json
    │
    └── src/
        ├── main.jsx                   ← React root
        ├── App.jsx                    ← Router + protected route wrapper
        ├── index.css                  ← CSS variable design system
        │
        ├── store/
        │   └── index.js               ← Zustand: useAuthStore + useThemeStore
        │
        ├── services/
        │   └── api.js                 ← Axios + JWT interceptor + all API fns
        │
        ├── hooks/
        │   └── useSocket.js           ← Socket.IO hook (event subscription)
        │
        ├── components/
        │   └── Layout.jsx             ← Sticky sidebar, topbar, mobile nav, dark mode
        │
        └── pages/
            ├── Auth/Login.jsx         ← Login + 4 demo account quick-fill
            ├── Dashboard/Dashboard.jsx← Charts, stats, recent permits
            ├── CHA/CHAPortal.jsx      ← Permit creation + live stage tracker
            ├── Gate/GateModule.jsx    ← Entry/exit queue + authorization panel
            ├── Weighbridge/           ← Tare/Gross entry + net weight calc
            │   WeighbridgeModule.jsx
            ├── Registration/          ← Vehicle + driver management + Excel upload
            │   Registration.jsx
            └── Reports/Reports.jsx    ← Daily report by date
```

---

## ✅ Prerequisites — Install These First

| Tool     | Minimum Version | Download Link                              |
|----------|-----------------|--------------------------------------------|
| Node.js  | v18 LTS+        | https://nodejs.org (click "LTS" button)    |
| VS Code  | Any recent      | https://code.visualstudio.com              |
| Git      | Any             | https://git-scm.com                        |

**Check you have Node.js:**
```bash
node --version   # must show v18.x.x or higher
npm --version    # must show 9.x.x or higher
```

---

## 🗄️ Database Setup

### Option A — MongoDB Atlas (Recommended — Free Forever)

1. Go to **https://cloud.mongodb.com** → Create free account
2. Click **"Build a Database"** → Choose **M0 Free** tier
3. Pick any region (pick one close to you)
4. Click **"Create"** (takes ~2 minutes)
5. **Create a database user:**
   - Security → Database Access → Add New Database User
   - Username: `sgasuser`, Password: `yourpassword123`
   - Role: Atlas Admin → Add User
6. **Allow your IP:**
   - Security → Network Access → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
7. **Get connection string:**
   - Deployment → Database → Connect → Drivers → Node.js
   - Copy the string, looks like: `mongodb+srv://sgasuser:<password>@cluster0.xxxxx.mongodb.net/...`
   - Replace `<password>` with your actual password
   - Replace the database name part with `sgas`:
     ```
     mongodb+srv://sgasuser:yourpassword123@cluster0.xxxxx.mongodb.net/sgas?retryWrites=true&w=majority
     ```
8. Paste this into `backend/.env` as `MONGODB_URI`

### Option B — Local MongoDB (Simpler for development)

1. Download MongoDB Community: https://www.mongodb.com/try/download/community
2. Install it (use defaults)
3. Start the service:
   ```bash
   # Windows (as Administrator):
   net start MongoDB
   
   # macOS (with Homebrew):
   brew services start mongodb-community
   
   # Linux:
   sudo systemctl start mongod
   ```
4. Use this URI in `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/sgas
   ```

---

## 🔐 Environment Variables

### `backend/.env` — Edit this file

The `.env` file is already created with defaults. **You only need to change `MONGODB_URI`**:

```env
PORT=5000
NODE_ENV=development

# ← CHANGE THIS to your MongoDB URI (Atlas or local)
MONGODB_URI=mongodb://localhost:27017/sgas

# JWT secret — can leave as-is for development
JWT_SECRET=sgas_super_secret_key_for_deendayal_port_2026_iit_madras
JWT_EXPIRE=7d

# Cloudinary — only needed if using file upload feature
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL for CORS
CLIENT_URL=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

### `frontend/.env` — Already correct, no changes needed

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Step-by-Step Setup in VS Code

### Step 1 — Open the project

```
File → Open Folder → select the "sgas" folder
```

### Step 2 — Open two terminals

- Press `Ctrl + `` ` `` ` to open Terminal
- Click the **＋** button (top-right of terminal panel) to open a second terminal
- Label them mentally: **Terminal 1 = Backend**, **Terminal 2 = Frontend**

### Step 3 — Set up Backend (Terminal 1)

```bash
cd backend
npm install
```

Edit the `.env` file — update `MONGODB_URI` to your database URL.

Seed the database with 25 vehicles, 25 drivers, 30 permits:
```bash
npm run seed
```

Expected output:
```
✅ Connected to MongoDB
🗑️  Cleared existing data
👥 4 users created
🚛 25 vehicles created
👤 25 drivers created
📋 30 permits created across all stages
🎉 Seed complete!
```

### Step 4 — Start Backend (Terminal 1)

```bash
npm run dev
```

Expected output:
```
[2026-05-01 10:00:00] info: 🚀 SGAS Server running on port 5000 [development]
[2026-05-01 10:00:01] info: ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
```

**Keep this terminal running.**

### Step 5 — Set up Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
  VITE v6.x  ready in 450ms
  ➜  Local:   http://localhost:5173/
```

### Step 6 — Open the app

Go to: **http://localhost:5173**

You'll see the login page. Use any demo account (click the quick-fill buttons or type manually).

---

## 👤 Demo Login Accounts

Run `npm run seed` in the backend folder first.

| Role              | Email                   | Password      | What they can see              |
|-------------------|-------------------------|---------------|--------------------------------|
| **Admin**         | admin@dpa.gov.in        | Admin@123     | Everything + Reports + Audit   |
| **CHA**           | cha@dpa.gov.in          | Cha@1234      | CHA Portal (permits only)      |
| **Gate Operator** | gate@dpa.gov.in         | Gate@1234     | Gate Module + Registration     |
| **Weighbridge**   | weigh@dpa.gov.in        | Weigh@1234    | Weighbridge Module only        |

---

## 🔁 Permit Lifecycle (State Machine)

Permits follow this strict linear workflow — **no stage can be skipped**:

```
GATE_ENTRY ──→ TARE_WEIGH ──→ LOADING ──→ GROSS_WEIGH ──→ GATE_EXIT ──→ COMPLETED
    ↑                ↑                          ↑
  CHA creates    Gate Operator            Weighbridge Op
  permit here    authorizes entry         records weights
```

**Backend enforcement:**
- API `POST /api/v1/permits/:id/transition` only allows moving forward
- Cannot record GROSS weight without TARE weight first
- Every transition records timestamp + operator ID in `stageHistory`
- Socket.IO event `permit_updated` fires on every transition

---

## ⚡ Real-Time Events (Socket.IO)

When any of these happen on the backend, **all connected browsers update instantly:**

| Event            | Triggered By                    | Frontend Reaction              |
|------------------|---------------------------------|--------------------------------|
| `permit_created` | CHA creates permit              | CHA list refreshes             |
| `permit_updated` | Any stage transition            | Dashboard + CHA list refresh   |
| `gate_entry`     | Gate operator authorizes entry  | Gate queue refreshes           |
| `gate_exit`      | Gate operator authorizes exit   | Gate queue refreshes           |
| `weight_updated` | Weighbridge records weight      | Weighbridge queue refreshes    |
| `permit_alert`   | Weight mismatch detected        | Notification banner appears    |

---

## 🔒 Role-Based Access (RBAC)

Enforced on the **backend** — the frontend just shows/hides routes, but the API rejects unauthorized calls:

| Role                  | Permissions                                                |
|-----------------------|------------------------------------------------------------|
| **ADMIN**             | All endpoints. Can see audit log. Can manage users.        |
| **CHA**               | Create permits. See only their own permits.                |
| **GATE_OPERATOR**     | Gate entry/exit. Registration (add vehicles/drivers).      |
| **WEIGHBRIDGE_OP**    | Record tare and gross weights only.                        |

```js
// How it works in routes:
router.post("/", protect, authorize("ADMIN","CHA"), createPermit);
// protect()   — verifies JWT, sets req.user
// authorize() — checks req.user.role against allowed list
```

---

## 🔌 API Reference

**Base URL:** `http://localhost:5000/api/v1`

All protected routes need: `Authorization: Bearer <your-jwt-token>`

### Auth
```
POST   /auth/login          { email, password }  → { token, user }
POST   /auth/register       { name, email, password, role }
GET    /auth/me             → current user
GET    /auth/users          → all users (Admin only)
```

### Vehicles
```
GET    /vehicles            ?search=&vahanStatus=&page=&limit=
POST   /vehicles            { plate, type, owner, state, ... }
PUT    /vehicles/:id        update fields
DELETE /vehicles/:id        soft delete
POST   /vehicles/:id/vahan  run VAHAN check
POST   /vehicles/bulk       { rows: [{plate, type, owner, ...}] }
```

### Drivers
```
GET    /drivers             ?search=&status=&page=&limit=
POST   /drivers             { name, license, mobile, ... }
PUT    /drivers/:id         update
DELETE /drivers/:id         soft delete
PUT    /drivers/:id/approve mark as approved
POST   /drivers/bulk        { rows: [{name, license, mobile, ...}] }
```

### Permits
```
GET    /permits             ?stage=&page=&limit=&search=
POST   /permits             { vcn, igmLine, vehicleId, driverId, cargo, declaredWeight }
GET    /permits/:id         single permit with populated refs
POST   /permits/:id/transition   advance to next stage
POST   /permits/:id/alert        { message } add alert
```

### Gate
```
GET    /gate/queue          ?mode=entry|exit
POST   /gate/:id/entry      authorize entry → moves to TARE_WEIGH
POST   /gate/:id/exit       authorize exit  → moves to COMPLETED
```

### Weighbridge
```
GET    /weighbridge/queue   all permits in TARE_WEIGH or GROSS_WEIGH
POST   /weighbridge/:id/tare    { weight } record tare weight
POST   /weighbridge/:id/gross   { weight } record gross → auto-calculates net
```

### Dashboard + Reports
```
GET    /dashboard/stats     aggregated stats + chart data
GET    /reports/daily       ?date=2026-05-01  daily report
GET    /audit               paginated audit log (Admin only)
GET    /health              { status: "ok" } — no auth needed
```

---

## 📊 Excel Bulk Upload

Both **Vehicles** and **Drivers** support Excel bulk upload from the Registration page.

### Vehicle Excel Format

| plate (required) | type (required) | owner (required) | rc_number | state | fitness_expiry |
|-----------------|-----------------|-----------------|-----------|-------|----------------|
| GJ12AB3456 | 10W Truck | Ramesh Transport | GJ-01-2018-001 | Gujarat | 2027-12-31 |

Valid vehicle types: `6W Truck`, `10W Truck`, `12W Trailer`, `14W Trailer`, `20W Trailer`

### Driver Excel Format

| name (required) | license (required) | mobile (required) | aadhaar | dob | address |
|----------------|-------------------|-------------------|---------|-----|---------|
| Ramesh Kumar | GJ01-20180023456 | +91-9876543210 | 7823 | 1985-06-15 | 123 Main St |

**Click "⬇ Template"** in the Registration page to download a pre-filled template.

---

## 🐛 Troubleshooting

### ❌ "MongoDB connection failed"
- Check `MONGODB_URI` in `backend/.env`
- Atlas: Go to Network Access → ensure `0.0.0.0/0` is allowed
- Atlas: Go to Database Access → ensure user has read/write access
- Local: Run `mongod` or start the MongoDB service

### ❌ "Cannot GET /api/v1/..."  (404 on frontend)
- Make sure backend is running (`npm run dev` in `/backend`)
- Frontend uses Vite proxy — this only works during dev, not after `npm run build`

### ❌ Login fails with correct password
- Re-run `npm run seed` — this recreates all demo accounts
- Check `JWT_SECRET` is set in `backend/.env`

### ❌ "Port 5000 already in use"
```bash
# macOS/Linux:
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ `npm install` fails
```bash
npm install --legacy-peer-deps
```

### ❌ Vehicles/Drivers dropdown empty in CHA Portal
This means either:
1. No VAHAN-verified vehicles → Go to Registration → Vehicles → click "🔍 VAHAN" on each vehicle
2. No approved drivers → Go to Registration → Drivers → click "✓ Approve" on pending drivers

Alternatively, re-run `npm run seed` which creates pre-approved data.

### ❌ Weighbridge queue is empty
The queue only shows permits in `TARE_WEIGH` or `GROSS_WEIGH` stage.
1. Use CHA Portal to create a permit
2. Use Gate Module to authorize entry (moves to `TARE_WEIGH`)
3. Now the Weighbridge queue will show the permit

---

## 🚀 Deployment (Production)

### Frontend → Vercel

```bash
cd frontend
npm run build    # creates /dist folder
```
1. Push to GitHub
2. Vercel.com → Import project → set root to `frontend/`
3. Add env variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api/v1
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```

### Backend → Render

1. Push to GitHub
2. Render.com → New Web Service → connect repo
3. Root directory: `backend`
4. Build: `npm install`
5. Start: `npm start`
6. Add all environment variables from `.env`

### Database → MongoDB Atlas

Already set up above. Change `NODE_ENV=production` in backend env.

---

## 🧰 Recommended VS Code Extensions

Install these for the best experience:

- **ESLint** — real-time error highlighting
- **Prettier** — auto-format on save
- **MongoDB for VS Code** — browse your database directly in VS Code
- **Thunder Client** — test API endpoints without Postman
- **GitLens** — enhanced Git history
- **ES7+ React Snippets** — React shorthand (`rafce` → component)

---

## 🧪 Quick API Test (No Frontend)

Open VS Code → **Thunder Client** extension → New Request:

**1. Login:**
```
POST  http://localhost:5000/api/v1/auth/login
Body (JSON):
{
  "email": "admin@dpa.gov.in",
  "password": "Admin@123"
}
```
Copy the `token` from response.

**2. Test dashboard (paste token):**
```
GET   http://localhost:5000/api/v1/dashboard/stats
Header: Authorization: Bearer <paste token here>
```

**3. Health check (no auth):**
```
GET   http://localhost:5000/health
```

---

*Built for Deendayal Port Authority · IIT Madras SGAS Project 2026*
