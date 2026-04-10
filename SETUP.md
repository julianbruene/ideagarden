# Idea Garden — Setup Guide

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL Editor, paste and run the entire contents of `supabase/schema.sql`.
3. In **Storage → Buckets**, create a bucket named `node-images` and set it to **Public**.
4. Copy your project URL and anon key from **Settings → API**.

## 2. Environment variables

```
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
```

Get your Anthropic key from [console.anthropic.com](https://console.anthropic.com).

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [vercel.com](https://vercel.com).
3. Add the three environment variables in **Project → Settings → Environment Variables**.
4. Deploy.

## Authentication

Sign up with email + password. Supabase sends a confirmation email — after confirming, sign in. All data is private per user.

## Feature overview

| Feature | How it works |
|---------|-------------|
| **Dump** | Text, voice (mic button), image paste/drag-drop, quote paste (auto-detected if >80 chars) |
| **Idea Sex** | Tap "Idea Sex" to randomly collide two nodes, or "Select" to pick your pair manually |
| **Promote** | Tap a node card → "Move to garden" to create a growing idea from it |
| **Garden** | Each idea has a live AI synthesis (updates after every message) + chat interface |
| **Ready to use** | Exports a `.md` file and moves the idea to the Done archive |
| **Done** | Read-only list of finished ideas, each downloadable as Markdown |
