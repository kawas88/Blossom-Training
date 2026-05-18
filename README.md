# Trainzy

A warm, modern training platform for trainers — interactive icebreakers, honest feedback, and AI-powered analysis for sessions that stay with people.

Multi-tenant SaaS. Each trainer or team gets a workspace, builds their own library of icebreakers and surveys, and runs sessions with their participants joining via a code.

---

## What it is

- **Hub-based participant flow** — participants enter a join code, then land on a hub with one button per available activity (warm-up, feedback). They tap whichever activity the trainer points them to.
- **Editorial design system** — cream paper background, DM Serif Display headlines with sage italics, DM Sans body, Space Mono for codes and labels. Warm, not transactional.
- **Multi-tenant workspaces** — every trainer or team works inside their own workspace with isolated trainings, icebreakers, surveys and members. Roles: owner, admin, trainer, viewer.
- **AI sentiment analysis** — long-form survey answers get summarised with Anthropic&rsquo;s Claude into themes, quotes and actionable suggestions for the trainer.
- **Branded CSV + PDF exports** — multi-page report with cover, participation stats, icebreaker accuracy, survey breakdowns and an AI executive summary.

## Pricing

- **Trial** — 14 days, no card. Full access, single seat.
- **Personal** — AED 199 / month. One trainer, unlimited trainings and participants.
- **Organization** — AED 899 / month. Up to 10 seats, shared workspace, priority support.

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
   Paste into `ADMIN_JWT_SECRET`.

4. **Run the migrations** in the Supabase SQL Editor, in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql` (replace the bcrypt placeholder with your own — see comments in the file)
   - `supabase/migrations/003_multi_tenancy.sql` (creates workspaces / membership tables and migrates existing rows to a Demo Workspace)

5. **Add your Anthropic API key** from [console.anthropic.com](https://console.anthropic.com) into `.env.local` as `ANTHROPIC_API_KEY`.

6. **Start the dev server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`:
   - Sign up at `/signup` to create a brand-new workspace and walk through onboarding.
   - Or sign in at `/admin/login` with the seed admin (`kawas@swiftap.studio` + your seed password) — you&rsquo;ll land in the Demo Workspace.
   - Try the demo participant flow with join code `ASQ-DEMO`.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo into Vercel. Framework auto-detects as Next.js.
3. Add all environment variables from `.env.example` in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://trainzy.io`)
4. Deploy. Subsequent pushes to `main` auto-deploy.

## Architecture overview

**Stack** — Next.js 14 (App Router) with TypeScript strict mode. Tailwind for styling. Supabase (Postgres + Realtime + Row-Level Security) for data. Anthropic SDK (`claude-sonnet-4-5`) for AI. `jose` + `bcryptjs` for custom JWT admin auth. `jspdf` + `jspdf-autotable` for PDF exports. Hosted on Vercel.

**Multi-tenancy** — `workspaces`, `workspace_members`, `workspace_invites` tables. Every root entity (`trainings`, `icebreakers`, `surveys`) has a `workspace_id` foreign key; child tables inherit via parent. Anon clients have zero access to workspace tables (RLS enabled, no public policies). Admin operations go through the service-role client wrapped in `requireWorkspaceAccess()` — every workspace-scoped route handler verifies the current user is a member of the target workspace at the required role, returning 404 on missing membership (to avoid leaking workspace IDs).

**Auth model** — Admin sessions are signed JWTs (HS256) in a 7-day httpOnly `trainzy_session` cookie. JWT carries `user_id`, `email`, `name`, `active_workspace_id` and `session_version`. Passwords are bcrypt. `session_version` is incremented on "sign out everywhere" to invalidate every existing JWT for a user. Roles (`owner` / `admin` / `trainer` / `viewer`) live per workspace in `workspace_members`. Public participant cookies (`pt_${training_id}`) are unchanged.

**Onboarding** — A fresh signup creates an admin user, a workspace (`{firstName}'s workspace`, slug auto-generated and de-duped), and an owner membership in one transaction. The user is dropped into a three-step wizard at `/admin/onboarding` (name workspace → training focus tags → welcome) under a sidebar-less `(setup)` route group. The dashboard layout redirects back here whenever `onboarded_at` is null.

**Invites** — Workspace admins generate an invite with a 7-day random token. For now there&rsquo;s no automated email — the admin copies the `/invite/{token}` link and shares it manually. Accepting the invite either signs in an existing matching account or signs up a new one, then adds the user to `workspace_members` and switches their active workspace.

**Realtime** — Training detail pages subscribe to Supabase Realtime channels for `participants`, response tables and `trainer_notes`. On any event the dashboard calls `router.refresh()` so server-rendered data refetches.

**AI** — `/api/ai/analyze-responses` summarises long-form survey answers via the Anthropic SDK with structured JSON output (sentiment / themes / quotes / suggestions). Cached in `ai_analyses` keyed on `(training_id, question_id)`. PDF exports include a separate executive-summary prompt.

## File map (high level)

```
app/
  page.tsx                                     Homepage (hero + join code)
  signup/                                      Signup form
  invite/[token]/                              Accept-invite flow
  join/                                        Code lookup + participant entry
  participant/[slug]/                          Hub + activities (icebreaker, survey)
  admin/
    (unauth)/login/                            Sign in
    (setup)/                                   Sidebar-less wizard layout
      onboarding/                              Three-step wizard
      workspaces/new/                          Create workspace flow
    (auth)/                                    Trainer studio (sidebar layout)
      page.tsx                                 Dashboard (scoped to active workspace)
      trainings/                               CRUD + detail with 5 tabs
      icebreakers/                             CRUD
      surveys/                                 CRUD
      settings/                                General / Members / Billing / Profile tabs
      no-workspace/                            Friendly fallback
  api/
    auth/{signup,accept-invite}/               Public auth
    admin/{login,logout}/
    admin/workspace/{switch,onboard}/
    admin/workspaces/                          Create + delete
    admin/invites/                             Create / revoke / resend
    admin/profile/{,password,sign-out-all}/    Per-user settings
    admin/trainings/                           Workspace-scoped CRUD + status + notes + exports
    admin/{icebreakers,surveys}/               Workspace-scoped CRUD
    ai/analyze-responses/                      Sentiment analysis with caching
    participants/join/                         Public
    responses/{matching,prompts,survey}/       Public
components/ui/                                 Editorial component library
lib/
  supabase/{client,server,admin}.ts            Three Supabase clients
  auth.ts                                      JWT + bcrypt + role helpers
  workspace.ts                                 Active workspace + switching helpers
  workspace-guard.ts                           requireWorkspaceAccess() for route handlers
  ai.ts                                        Anthropic helpers
  types.ts                                     DB types and helpers
  utils.ts                                     Token / code / slug / formatters
supabase/migrations/                           001 schema + 002 seed + 003 multi-tenancy
```
