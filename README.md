# Nursery Trainer Hub

A warm, editorial training platform for nursery educators — interactive icebreakers on phones, an honest post-training survey, and an AI-assisted dashboard for the trainer.

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com). Copy the project URL, anon key, and service role key into `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Generate an admin JWT secret**
   ```bash
   openssl rand -base64 32
   ```
   Paste the output into `ADMIN_JWT_SECRET` in `.env.local`.

4. **Generate a bcrypt hash for the seed admin password**
   ```bash
   node -e "require('bcryptjs').hash('YOUR_PASSWORD', 10).then(console.log)"
   ```
   Open `supabase/migrations/002_seed_data.sql` and replace the placeholder hash on the `admin_users` insert with the value you just generated.

5. **Run the migrations** in the Supabase SQL Editor, in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`

6. **Add your Anthropic API key** from [console.anthropic.com](https://console.anthropic.com) into `.env.local` as `ANTHROPIC_API_KEY`.

7. **Start the dev server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Sign in at `/admin/login` with `kawas@swiftap.studio` and the password you used in step 4. Try the demo flow with join code `ASQ-DEMO`.

## Deploy to Vercel

1. Push to GitHub via GitHub Desktop (or `git push -u origin main`).
2. In Vercel, import the repo. The framework should auto-detect Next.js.
3. Add **all** environment variables from `.env.example` in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` — set to your Vercel deployment URL (e.g. `https://nursery-trainer-hub.vercel.app`)
4. Deploy. Subsequent pushes to `main` auto-deploy.

## Default credentials

- **Admin login**: `kawas@swiftap.studio` / *(the password you used when generating the bcrypt hash above)*
- **Demo training join code**: `ASQ-DEMO`

## Architecture overview

**Stack** — Next.js 14 (App Router) with TypeScript strict mode, Tailwind for styling, Supabase for the database (Postgres + Realtime + Row-Level Security), Anthropic SDK for AI, jsPDF for the printed report. Hosted on Vercel.

**Auth model** — Admin sessions are signed JWTs (HS256) stored in a 7-day httpOnly cookie. Passwords are hashed with bcrypt. Server components call `getAdminSession()` to gate `(auth)` routes. Public-facing pages identify participants by a per-training cookie that holds a random `session_token` matched against the `participants` table; row-level security policies allow public reads of live trainings and inserts of responses, while writes from the admin side use the service role and bypass RLS entirely.

**Realtime** — The training detail page subscribes to Supabase Realtime channels for `participants`, `icebreaker_*_responses`, `survey_responses` and `trainer_notes`. On any event the dashboard calls `router.refresh()` so server-rendered data refetches and the UI stays in sync across the trainer's laptop and the room's projector.

**AI** — `/api/ai/analyze-responses` summarises long-form survey answers via the Anthropic SDK using `claude-sonnet-4-5`. Output is structured JSON (sentiment / themes / quotes / suggestions) and cached in `ai_analyses` keyed on `(training_id, question_id)`. The PDF export also calls a separate prompt that produces a one-paragraph executive summary plus 3–5 takeaways for the cover of the report.

## File map

```
app/
  layout.tsx · globals.css · page.tsx           Homepage
  join/                                         Code lookup + name entry
  participant/[slug]/                           Participant flow (icebreaker → survey → done)
  admin/(unauth)/login/                         Sign in
  admin/(auth)/                                 Trainer studio (sidebar layout)
    page.tsx                                    Dashboard
    trainings/                                  List, new, detail with 5 tabs
    icebreakers/                                List + new + edit
    surveys/                                    List + new + edit
  api/
    participants/join/                          Create participant
    responses/{matching,prompts,survey}/        Save responses
    admin/login · logout
    admin/trainings/                            POST + PATCH + status + notes + exports
    admin/icebreakers · admin/surveys           Full CRUD with nested children
    ai/analyze-responses/                       Sentiment analysis (cached)
components/ui/                                  Editorial component library
lib/
  supabase/{client,server,admin}.ts             Three Supabase clients
  auth.ts                                       JWT + bcrypt admin auth
  ai.ts                                         Anthropic helpers
  types.ts                                      DB types and helpers
  utils.ts                                      Token / code / slug / formatters
supabase/migrations/                            001 schema + 002 seed
```
