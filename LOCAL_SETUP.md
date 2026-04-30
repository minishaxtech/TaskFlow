# 🚀 Task Manager — Local Setup Guide

## Prerequisites (install these once)
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ← easiest way to get Postgres

---

## Step 1 — Start PostgreSQL via Docker

Open a terminal and run:

```bash
docker run --name taskdb \
  -e POSTGRES_USER=taskuser \
  -e POSTGRES_PASSWORD=taskpass \
  -e POSTGRES_DB=taskmanager \
  -p 5432:5432 \
  -d postgres:15
```

✅ This starts a Postgres instance at `localhost:5432`.  
To stop it later: `docker stop taskdb`  
To start it again: `docker start taskdb`

---

## Step 2 — Set Up Backend

```bash
cd taskmanager/backend
```

### Create your .env file
```bash
cp .env.example .env
```

Then open `.env` and make sure it looks like this:
```env
DATABASE_URL="postgresql://taskuser:taskpass@localhost:5432/taskmanager"
JWT_SECRET="supersecretlocalkey123"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

### Install dependencies & set up DB
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed       # (optional) loads sample data
```

### Start the backend
```bash
npm run dev
```

✅ Backend running at: **http://localhost:4000**

---

## Step 3 — Set Up Frontend

Open a **new terminal tab**:

```bash
cd taskmanager/frontend
```

### Create your .env file
```bash
cp .env.example .env.local
```

Make sure `.env.local` contains:
```env
VITE_API_URL=http://localhost:4000/api
```

### Install & run
```bash
npm install
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

---

## 🎉 You're Live!

Open **http://localhost:5173** in your browser.

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:5173       |
| Backend   | http://localhost:4000       |
| DB Studio | `npx prisma studio` (bonus) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to database` | Make sure Docker is running: `docker start taskdb` |
| `Port 4000 already in use` | Kill it: `lsof -ti:4000 \| xargs kill` |
| `Port 5173 already in use` | Kill it: `lsof -ti:5173 \| xargs kill` |
| Prisma errors | Run `npx prisma generate` again |
| CORS errors in browser | Check `FRONTEND_URL` in backend `.env` matches exactly |

---

## No Docker? Alternative (native Postgres)

Install Postgres from https://www.postgresql.org/download/, then:

```bash
psql -U postgres -c "CREATE USER taskuser WITH PASSWORD 'taskpass';"
psql -U postgres -c "CREATE DATABASE taskmanager OWNER taskuser;"
```

Then use the same DATABASE_URL as above.
