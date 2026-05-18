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

| Plan | Monthly | Annual (save 17%) | Seats |
|---|---|---|---|
| **Trial** | free | — | 1 |
| **Personal** | AED 199 / USD 54 | AED 1,990 / USD 540 | 1 |
| **Organization** | AED 899 / USD 245 | AED 8,990 / USD 2,450 | 10 |

Trial is automatic on signup — 14 days, no card. Cancel anytime. Stripe handles all card data.

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
   - `supabase/migrations/003_multi_tenancy.sql` (multi-tenancy + Demo Workspace backfill)
   - `supabase/migrations/004_billing.sql` (Stripe columns + billing_events audit table)

5. **Add your Anthropic API key** from [console.anthropic.com](https://console.anthropic.com) into `.env.local` as `ANTHROPIC_API_KEY`.

6. **Set up Stripe.**
   - Create a Stripe account (or use an existing one) and switch to **Test mode**.
   - Copy your secret + publishable keys from Developers → API keys into `.env.local`:
     ```
     STRIPE_SECRET_KEY=sk_test_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
     ```
   - Run the products + prices setup:
     ```bash
     npm run setup:stripe
     ```
     This creates two products ("Trainzy Personal" / "Trainzy Organization") with eight prices (AED/USD × monthly/annual) and prints the eight `STRIPE_PRICE_*` env vars. Paste those into `.env.local`.
   - Configure the Customer Portal:
     ```bash
     npm run setup:stripe-portal
     ```
   - Install the Stripe CLI (`brew install stripe/stripe-cli/stripe` on macOS, or see [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)) and log in:
     ```bash
     stripe login
     ```
   - In a second terminal, forward webhooks to your local server:
     ```bash
     stripe listen --forward-to http://localhost:3000/api/billing/webhook
     ```
     The CLI prints a `whsec_...` secret — paste it into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

7. **Start the dev server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`:
   - Sign up at `/signup` to create a brand-new workspace and walk through onboarding.
   - Or sign in at `/admin/login` with the seed admin (`kawas@swiftap.studio` + your seed password) — you&rsquo;ll land in the Demo Workspace.
   - Try the demo participant flow with join code `ASQ-DEMO`.
   - View pricing at `/pricing`.

## Testing the billing flow

Stripe test card numbers (any future expiry, any 3-digit CVC, any postal code):

- `4242 4242 4242 4242` — successful payment
- `4000 0025 0000 3155` — requires 3D Secure auth
- `4000 0000 0000 9995` — declined (insufficient funds)

A clean end-to-end test:

1. Sign up a fresh account at `/signup`.
2. Land in onboarding, complete it, end up on the dashboard.
3. Go to `/admin/settings?tab=billing` — see the "free trial" card.
4. Click **Upgrade to Personal** (monthly AED). Stripe Checkout opens.
5. Pay with `4242 4242 4242 4242`. Redirects back to `/admin/settings/billing?session_id=...`.
6. The "Welcome to Trainzy — setting things up." banner appears and polls.
7. Within a second or two the Stripe CLI shows webhook events; your workspace flips to Personal.
8. The banner clears and you see the Personal plan card.
9. Click **Manage subscription** → Stripe Customer Portal opens.
10. Cancel in the portal → return to Trainzy → see "Canceling on …" pill.

Trial-expired enforcement:

- Manually set a test workspace's `trial_ends_at` to a past timestamp in the Supabase SQL editor.
- Open the dashboard — a yellow banner appears at the top.
- Try to create a training — the API returns 402 with a friendly message and the UI surfaces it.
- Existing trainings, exports, and dashboards still work read-only.

Seat-limit enforcement:

- On a Personal plan workspace, try inviting a 2nd teammate — the form blocks with "You&rsquo;ve reached your seat limit."

Webhook idempotency:

- In the Stripe Dashboard → Developers → Events, click any past event → **Resend**.
- The webhook returns 200 with `{ "ok": true, "idempotent": true }` and does not double-process.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo into Vercel. Framework auto-detects as Next.js.
3. Add all environment variables from `.env.example` in the Vercel project settings — Supabase keys, Anthropic key, `ADMIN_JWT_SECRET`, `NEXT_PUBLIC_APP_URL` (your Vercel URL).
4. **Set up Stripe for production**:
   - Switch your Stripe Dashboard to **Live mode**.
   - Repeat `npm run setup:stripe` against your local `.env.local` *with the live secret key* — it will create live-mode products and prices and print the live `STRIPE_PRICE_*` IDs.
   - Repeat `npm run setup:stripe-portal` similarly.
   - Paste live `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and the eight live `STRIPE_PRICE_*` env vars into Vercel.
   - In the Stripe Dashboard → Developers → Webhooks, create an endpoint pointing to `https://your-vercel-url/api/billing/webhook`. Subscribe to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `checkout.session.completed`, `customer.deleted`. Copy the signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Subsequent pushes to `main` auto-deploy.

## Discount management

Coupons live in Stripe — no code change needed. To create one (e.g. for a founding member):

1. Stripe Dashboard → Products → **Coupons** → Create.
2. Pick the discount (e.g. 50% off, duration: forever).
3. Optionally restrict to specific prices (e.g. only Personal annual).
4. Create a **Promotion Code** for the coupon — that's the short code customers type.
5. Share with the customer. They apply it at Stripe Checkout (we pass `allow_promotion_codes: true`).

## Architecture overview

**Stack** — Next.js 14 (App Router) with TypeScript strict mode. Tailwind for styling. Supabase (Postgres + Realtime + Row-Level Security) for data. Anthropic SDK (`claude-sonnet-4-5`) for AI. `jose` + `bcryptjs` for custom JWT admin auth. `jspdf` + `jspdf-autotable` for PDF exports. Hosted on Vercel.

**Multi-tenancy** — `workspaces`, `workspace_members`, `workspace_invites` tables. Every root entity (`trainings`, `icebreakers`, `surveys`) has a `workspace_id` foreign key; child tables inherit via parent. Anon clients have zero access to workspace tables (RLS enabled, no public policies). Admin operations go through the service-role client wrapped in `requireWorkspaceAccess()` — every workspace-scoped route handler verifies the current user is a member of the target workspace at the required role, returning 404 on missing membership (to avoid leaking workspace IDs).

**Auth model** — Admin sessions are signed JWTs (HS256) in a 7-day httpOnly `trainzy_session` cookie. JWT carries `user_id`, `email`, `name`, `active_workspace_id` and `session_version`. Passwords are bcrypt. `session_version` is incremented on "sign out everywhere" to invalidate every existing JWT for a user. Roles (`owner` / `admin` / `trainer` / `viewer`) live per workspace in `workspace_members`. Public participant cookies (`pt_${training_id}`) are unchanged.

**Onboarding** — A fresh signup creates an admin user, a workspace (`{firstName}'s workspace`, slug auto-generated and de-duped), and an owner membership in one transaction. The user is dropped into a three-step wizard at `/admin/onboarding` (name workspace → training focus tags → welcome) under a sidebar-less `(setup)` route group. The dashboard layout redirects back here whenever `onboarded_at` is null.

**Invites** — Workspace admins generate an invite with a 7-day random token. For now there&rsquo;s no automated email — the admin copies the `/invite/{token}` link and shares it manually. Accepting the invite either signs in an existing matching account or signs up a new one, then adds the user to `workspace_members` and switches their active workspace.

**Realtime** — Training detail pages subscribe to Supabase Realtime channels for `participants`, response tables and `trainer_notes`. On any event the dashboard calls `router.refresh()` so server-rendered data refetches.

**AI** — `/api/ai/analyze-responses` summarises long-form survey answers via the Anthropic SDK with structured JSON output (sentiment / themes / quotes / suggestions). Cached in `ai_analyses` keyed on `(training_id, question_id)`. PDF exports include a separate executive-summary prompt.

**Billing (Phase 2)** — Stripe Checkout for new subscriptions, Stripe Customer Portal for self-service management. Webhooks at `/api/billing/webhook` are the source of truth for subscription state; they verify the signature with `stripe.webhooks.constructEvent` against the raw request body, then check `billing_events.stripe_event_id` for idempotency before processing. The 14-day trial is enforced entirely in Trainzy code (`workspaces.trial_ends_at`) — we don't pass `trial_period_days` to Stripe. Stripe doesn't know about seats — seat limits (1 for Personal, 10 for Organization) are enforced at the application level, so changing limits later doesn't require touching Stripe. Locale-aware currency: AED for `x-vercel-ip-country = AE`, USD elsewhere, with a manual toggle on the pricing and billing pages.

**Trial-expiry strategy** — No cron. Every server-rendered admin page and every content-mutation API route computes `getBillingState()` on demand and gates accordingly. Past-due / canceled workspaces are read-only with a banner; trial-expired likewise. This keeps infrastructure simple — a cron can land later for email notifications.

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
  pricing/                                     Public pricing page with currency + interval toggle
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
    billing/{checkout,portal,webhook}/         Stripe (Phase 2)
    participants/join/                         Public
    responses/{matching,prompts,survey}/       Public
components/billing/BillingBanner.tsx           Cross-page billing-state banner
components/ui/                                 Editorial component library
lib/
  supabase/{client,server,admin}.ts            Three Supabase clients
  auth.ts                                      JWT + bcrypt + role helpers
  workspace.ts                                 Active workspace + switching helpers
  workspace-guard.ts                           requireWorkspaceAccess() for route handlers
  billing-state.ts                             Pure billing-state derivation (client-safe)
  billing-guard.ts                             requirePaidOrActiveTrial() for route handlers
  stripe.ts                                    Stripe SDK init + price catalog + customer helpers
  locale.ts                                    Currency detection from request headers
  ai.ts                                        Anthropic helpers
  types.ts                                     DB types and helpers
  utils.ts                                     Token / code / slug / formatters
scripts/
  setup-stripe.ts                              `npm run setup:stripe` — creates products + prices
  setup-stripe-portal.ts                       `npm run setup:stripe-portal` — Customer Portal config
supabase/migrations/                           001 schema + 002 seed + 003 multi-tenancy + 004 billing
```
