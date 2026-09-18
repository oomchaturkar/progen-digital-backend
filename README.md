# Progen Digital — contact form backend

A small Express API that receives the website's contact form and stores
each enquiry in a Postgres database (works great with a free Supabase
project — no cost, and data survives restarts, unlike a local SQLite file).

## What it does

- `POST /api/contact` — accepts `{ name, email, projectType, budget, message }`,
  validates name + email, saves it, returns `{ ok: true, id }`.
- `GET /api/submissions` — returns all saved enquiries. Requires a header
  `x-admin-key: <your ADMIN_KEY>` — this is the only way to read leads back,
  so keep that key private.
- `GET /api/health` — returns `{ ok: true }`, useful for confirming a deploy worked.

## 1. Create a free Supabase project (your database)

1. Go to [supabase.com](https://supabase.com) → sign up (free, no card needed)
2. Click **New project** — give it any name, set a database password (save it!)
3. Wait about a minute for it to finish setting up
4. Click **Connect** (top of the project dashboard) → copy the **Connection
   string** under "Connection pooling" (URI format). It looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-xx-xxxx-1.pooler.supabase.com:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` in that string with the database password you set
   in step 2

This connection string is your `DATABASE_URL`. The table itself
(`submissions`) is created automatically the first time the server starts —
you don't need to set anything up manually in Supabase.

## 2. Run it locally

```bash
npm install
cp .env.example .env
# paste your Supabase connection string into DATABASE_URL in .env
npm start
```

Server runs on `http://localhost:3000` by default. Test it:

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"hello"}'

curl -H "x-admin-key: change-me" http://localhost:3000/api/submissions
```

## 3. Deploy it (Render — free tier)

1. Push this `backend` folder to a GitHub repo (or a `backend/` subfolder of
   your site's repo).
2. Go to [render.com](https://render.com) → New → Web Service → connect the repo.
3. Settings:
   - **Root directory**: `backend` (if it's a subfolder)
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. Add environment variables (Render dashboard → Environment):
   - `ADMIN_KEY` — a long random string, e.g. generate one with
     `openssl rand -hex 24`
   - `DATABASE_URL` — your Supabase connection string from step 1
   - `ALLOWED_ORIGIN` — your live site's URL, e.g. `https://progendigital.com`
     (leave it out while testing, add it once the site has a real domain)
5. Deploy. Render gives you a URL like `https://progen-backend.onrender.com`.
6. Confirm it's live: visit `https://progen-backend.onrender.com/api/health`
   in a browser — you should see `{"ok":true,...}`.

Railway and Fly.io work the same way if you'd rather use one of those —
same build/start commands, same environment variables.

**Note on Render's free tier:** the web service itself still "sleeps" after
15 minutes of no traffic and takes a few seconds to wake up on the next
request — that part hasn't changed and is harmless (just a short delay).
The important difference now is that your **data no longer disappears**
when that happens, because it lives in Supabase, not on Render's local
disk.

**Note on Supabase's free tier:** if your project sees zero activity for
7 days straight, Supabase pauses it. Opening the project dashboard
un-pauses it in a few seconds, and no data is lost — it's just paused, not
deleted.

## 4. Connect the website to it

In the site's `script.js`, set:

```js
const CONTACT_API_URL = 'https://progen-backend.onrender.com/api/contact';
```

That's the only change needed — the form already POSTs to whatever URL is
set there.

## 5. Viewing enquiries

Use the `admin.html` dashboard page (paste your `ADMIN_KEY` into it) for a
table view that auto-refreshes, or check directly with curl:

```bash
curl -H "x-admin-key: YOUR_ADMIN_KEY" https://progen-backend.onrender.com/api/submissions
```
