# TaskFlow — Team Task Manager

A full-stack task management web app with role-based access control (Admin/Member), built with React, Node/Express, Prisma, and PostgreSQL. Deployed on Railway.

---

## Features

- **Auth** — JWT-based signup/login, token stored in localStorage, auto-logout on expiry
- **Projects** — create, list, delete; invite members by email; each project has an owner
- **RBAC** — `ADMIN` can manage members, edit project, delete any task; `MEMBER` can create/edit tasks
- **Tasks** — create with title, description, status (TODO / IN_PROGRESS / DONE), priority (LOW / MEDIUM / HIGH), due date, assignee
- **Dashboard** — stats (total projects, tasks by status, overdue count), my open tasks, overdue tasks
- **Overdue tracking** — tasks past due date that aren't DONE are surfaced prominently

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 18 + Vite | Fast HMR, modern bundler |
| Styling | Tailwind CSS | Utility-first, no CSS files |
| Data fetching | TanStack Query v5 | Caching, invalidation, loading states |
| Backend | Node.js + Express | Minimal, familiar, Railway-native |
| ORM | Prisma | Type-safe queries, migrations |
| Database | PostgreSQL | Railway add-on, relational FK integrity |
| Auth | JWT (bcryptjs) | Stateless, easy horizontal scale |
| Deployment | Railway | Free tier, postgres add-on, monorepo support |

---

## Local Development

### Prerequisites
- Node.js ≥ 18
- PostgreSQL running locally (or use a free Supabase/Railway dev DB)

### 1. Clone and install

```bash
git clone https://github.com/yourname/taskmanager
cd taskmanager

# Backend
cd backend
npm install
cp .env.example .env  # fill in DATABASE_URL, JWT_SECRET

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
```

### 2. Database setup

```bash
cd backend
npx prisma migrate dev --name init   # runs migrations
npm run db:seed                       # seeds demo user
```

### 3. Run both services

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000  
Prisma Studio: `cd backend && npm run db:studio`

### Demo credentials
- `admin@demo.com` / `password123` (Admin role)
- `member@demo.com` / `password123` (Member role)

---

## Deployment on Railway

### Step 1 — Create Railway project

```
railway login
railway new
```

### Step 2 — Add PostgreSQL add-on

In the Railway dashboard → New Service → Database → PostgreSQL.  
Copy the `DATABASE_URL` from the Variables tab.

### Step 3 — Deploy backend

```bash
cd backend
railway link         # link to the project
railway up           # deploy
```

Set environment variables in Railway dashboard:
```
DATABASE_URL=<from Railway Postgres add-on>
JWT_SECRET=<generate with: openssl rand -hex 64>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.up.railway.app
NODE_ENV=production
PORT=4000
```

### Step 4 — Deploy frontend

```bash
cd frontend
railway up
```

Set:
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

Railway auto-detects Vite builds and serves the static output.

### Step 5 — Run migrations in production

After first deploy:
```bash
railway run npx prisma migrate deploy
railway run node prisma/seed.js
```

---

## API Reference

### Auth
| Method | Path | Auth | Body | Notes |
|--------|------|------|------|-------|
| POST | `/api/auth/register` | — | `{name, email, password}` | Returns token + user |
| POST | `/api/auth/login` | — | `{email, password}` | Returns token + user |
| GET | `/api/auth/me` | Bearer | — | Returns current user |

### Projects
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/api/projects` | any member | Lists user's projects |
| POST | `/api/projects` | authenticated | Creates project, caller = ADMIN |
| GET | `/api/projects/:id` | member | Project + members |
| PATCH | `/api/projects/:id` | admin | Edit name/description |
| DELETE | `/api/projects/:id` | admin | Cascades to tasks/members |
| POST | `/api/projects/:id/members` | admin | `{email, role}` |
| DELETE | `/api/projects/:id/members/:userId` | admin | Can't remove owner |

### Tasks
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/api/projects/:id/tasks` | member | Supports `?status=&priority=&assigneeId=` |
| POST | `/api/projects/:id/tasks` | member | Creates task |
| PATCH | `/api/projects/:id/tasks/:taskId` | member | Updates any field |
| DELETE | `/api/projects/:id/tasks/:taskId` | admin or creator | |

### Dashboard
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/dashboard` | authenticated |

---

## Project Structure

```
taskmanager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   ← data models
│   │   └── seed.js
│   ├── src/
│   │   ├── lib/prisma.js   ← singleton client
│   │   ├── middleware/
│   │   │   └── auth.js     ← JWT + RBAC guards
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── dashboard.js
│   │   └── index.js        ← app entry
│   ├── .env.example
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── lib/api.js          ← axios + interceptors
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Projects.jsx
    │   │   └── ProjectDetail.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── .env.example
```

---

## Extending beyond MVP

- **Notifications** — use Railway Cron + nodemailer for due-date emails
- **Comments on tasks** — add `Comment` model (taskId, userId, body)
- **File attachments** — store in S3/R2, reference URL in Task
- **Activity log** — append-only `ActivityEvent` table per project
- **WebSocket** — Socket.io on Express for real-time task updates
