# Neon DB — DebugBattle

Stack: **Drizzle ORM** + **@neondatabase/serverless** (HTTP transport, works in Next.js serverless/edge)

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/schema.js` | Drizzle table definitions (`users`) |
| `src/lib/db.js` | Neon + Drizzle client (`db` export) |
| `src/lib/db-users.js` | `upsertUser`, `deleteUserByClerkId` |
| `src/app/api/webhooks/clerk/route.js` | Clerk webhook → upserts/deletes user in Neon |
| `drizzle.config.mjs` | Drizzle Kit config (for `npm run db:push`) |

---

## One-time Setup

### Step 1 — Create Neon project

1. Go to https://console.neon.tech and create a project (name it `debug-battle`)
2. From the dashboard, copy the **Connection string**:
   ```
   postgresql://user:pass@host.neon.tech/dbname?sslmode=require
   ```
3. Add it to `.env.local`:
   ```
   DATABASE_URL=postgresql://...your connection string...
   ```

### Step 2 — Push schema

With `DATABASE_URL` in `.env.local`, run:

```bash
npm run db:push
```

Drizzle Kit reads `.env.local` automatically, connects to Neon, and creates the `users` table. You'll see a confirmation prompt — type **y** to apply.

> If it says `DATABASE_URL is not defined`, copy it into a `.env` file in the project root as well (Drizzle Kit fallback).

### Step 3 — Set up Clerk webhook

Webhooks need a public URL. For **local dev** see the section below. For **production**, use your deployed domain.

---

## Local Development (Webhook via ngrok)

Clerk can't reach `localhost` directly — you need a public tunnel.

### Install ngrok

- **Windows (winget):** `winget install ngrok`
- **Or download:** https://ngrok.com/download

Sign up for a free ngrok account and authenticate:
```bash
ngrok config add-authtoken YOUR_TOKEN_FROM_NGROK_DASHBOARD
```

### Run the tunnel

1. Start the Next.js dev server (if not already running):
   ```bash
   npm run dev
   ```

2. In a **separate terminal**, start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Copy the **Forwarding URL** — looks like:
   ```
   https://abc123.ngrok-free.app
   ```

### Add webhook endpoint in Clerk

1. Go to **Clerk Dashboard** → your app → **Webhooks** → **Add Endpoint**
2. Set URL to:
   ```
   https://abc123.ngrok-free.app/api/webhooks/clerk
   ```
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Click **Create**
5. Copy the **Signing Secret** (starts with `whsec_`)
6. Add to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```
7. Restart the dev server: `npm run dev`

> **Free ngrok gives a new URL every restart.** When you restart ngrok, update the endpoint URL in Clerk Dashboard → Webhooks → your endpoint → Edit.

### Test it

1. Open the app and sign up with a new account
2. Go to Neon dashboard → **Tables** → `users` — a new row should appear with your Clerk user ID, email, and name

---

## Deploying to Vercel

Follow these steps **in order** — the webhook needs the live domain, which you only get after the first deploy.

### Step 1 — Add environment variables to Vercel

1. Go to https://vercel.com → your project → **Settings** → **Environment Variables**
2. Add the following (set scope to **Production** + **Preview** for both):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk Dashboard → API Keys |
   | `CLERK_SECRET_KEY` | from Clerk Dashboard → API Keys |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |
   | `GROQ_API_KEY` | your Groq key |
   | `GROQ_MODEL` | `qwen/qwen3-32b` |
   | `CLERK_WEBHOOK_SECRET` | **leave blank for now** — you'll fill this in Step 3 |

   > Do NOT add `CLERK_WEBHOOK_SECRET` a value yet — you don't have a production signing secret until Step 3.

### Step 2 — Deploy

Push your code or trigger a deploy from the Vercel dashboard. Once it finishes, copy your **production URL** (e.g., `https://debug-battle.vercel.app`).

### Step 3 — Add production Clerk webhook

1. Go to **Clerk Dashboard** → your app → **Webhooks** → **Add Endpoint**
2. Set URL to:
   ```
   https://debug-battle.vercel.app/api/webhooks/clerk
   ```
   *(Replace with your actual Vercel domain)*
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Click **Create**
5. Copy the **Signing Secret** (starts with `whsec_`)

### Step 4 — Set the webhook secret on Vercel

1. Go back to Vercel → **Settings** → **Environment Variables**
2. Find `CLERK_WEBHOOK_SECRET` and set its value to the `whsec_...` you just copied
3. **Redeploy** so the new env var takes effect:
   - Vercel dashboard → **Deployments** → latest deploy → **Redeploy**
   - Or push any small commit to trigger a fresh deploy

### Step 5 — Verify it works

1. Open your production URL and sign up with a new account
2. Go to **Neon dashboard** → your project → **Tables** → `users`
3. A row should appear with the new user's Clerk ID, email, and name

---

### Neon + Vercel native integration (optional shortcut)

Vercel and Neon have a built-in integration that auto-populates `DATABASE_URL` and creates separate connection strings per environment (production / preview / development):

1. Vercel dashboard → your project → **Integrations** → search **Neon** → **Add Integration**
2. Authorize and link your Neon project
3. Vercel will automatically inject `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`) into all environments

If you use this, you can skip manually adding `DATABASE_URL` in Step 1 above.

---

## Schema changes

To add columns or modify the `users` table later:

1. Edit `src/lib/schema.js`
2. Run:
   ```bash
   npm run db:push
   ```
   Drizzle Kit will diff the current DB state against the schema and apply only what changed.

---

## users table (current schema)

```
id          SERIAL PRIMARY KEY
clerk_id    TEXT UNIQUE NOT NULL   ← Clerk's user ID (user_abc123)
email       TEXT
username    TEXT
first_name  TEXT
last_name   TEXT
image_url   TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```
