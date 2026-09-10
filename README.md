# JOOLA Korea Operations Hub

A private internal dashboard for managing JOOLA Korea pickleball operations — dealers,
inventory, events, and tasks, with a live dashboard on top. See `ARCHITECTURE.md` for
the reasoning behind every design decision; this file is the practical how-to.

## What you need before you start

- A free [Vercel](https://vercel.com) account (for hosting).
- A free [Supabase](https://supabase.com) account (for the database + login).
- [Node.js](https://nodejs.org) 18 or newer installed on your computer, and a way to
  run terminal commands (Terminal on Mac, PowerShell/Git Bash on Windows).
- A GitHub account, so Vercel can deploy straight from your repository.

Nothing here requires programming experience beyond copy-pasting commands and filling
in values — every step below is written for that.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name (e.g. "joola-korea-ops") and a strong database password — save that
   password somewhere safe, you won't need it day-to-day but you might later.
3. Pick the region closest to Korea (e.g. Northeast Asia / Seoul if offered, otherwise
   Tokyo) for the best speed.
4. Wait for the project to finish provisioning (a minute or two).

## 2. Run the database schema

1. In your Supabase project, open the **SQL Editor** (left sidebar).
2. Click **New query**, then open `supabase/migrations/0001_init.sql` from this
   project on your computer, copy its entire contents, paste into the SQL editor, and
   click **Run**. This creates every table, view, and security policy the app needs.
3. *(Optional)* Repeat with `supabase/seed.sql` if you want a few sample dealers,
   products, and tasks to look at before entering real data. Safe to skip.

## 3. Create your admin login

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password. Leave "Auto Confirm User" checked so you don't
   need to click an email confirmation link.
3. This automatically creates a matching row in the `profiles` table with the role
   `viewer` — you need to promote yourself to `admin` or you won't be able to add or
   edit any data. Go back to the **SQL Editor** and run:

   ```sql
   update profiles set role = 'admin' where id =
     (select id from auth.users where email = 'you@yourcompany.com');
   ```

   (Replace the email with the one you just created.)

## 4. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. You'll need two values from this page:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public key** (a long string starting with `eyJ...`)
3. Keep this browser tab open — you'll paste these into two places in the next steps.

## 5. Run it on your own computer first (recommended)

1. Open a terminal in this project folder.
2. Copy the example environment file: `cp .env.example .env.local`
3. Open `.env.local` in any text editor and paste in your Project URL and anon key
   from step 4.
4. Install dependencies: `npm install`
5. Start the app: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000) — you should land on the login
   page. Sign in with the account you created in step 3.

If this works, you're ready to deploy. If sign-in fails, double check the admin role
update in step 3 actually matched your email.

## 6. Deploy to Vercel

1. Push this project to a new GitHub repository (if you're not sure how: create an
   empty repo on GitHub, then in this folder run
   `git init && git add . && git commit -m "Initial commit"`, then follow GitHub's
   "push an existing repository" instructions it shows you for that new repo).
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import that GitHub
   repository.
3. Vercel will auto-detect Next.js — you don't need to change any build settings.
4. Before clicking Deploy, expand **Environment Variables** and add the same two
   values from step 4:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. After a couple of minutes you'll get a live URL
   (`https://your-project.vercel.app`) — that's your private dashboard.
6. Bookmark it. Nobody can sign up on their own; you create every account manually in
   Supabase (repeat step 3 with a different email when you're ready to add someone).

## Day-to-day maintenance

- **Add a user:** repeat step 3 with their email. To give them a role other than
  admin, set `role` to `sales`, `marketing`, `ecommerce`, or `viewer` in that same SQL
  statement instead of `admin`. (Note: in the current MVP, only the `admin` role can
  write data — other roles can sign in and view everything but can't yet edit. See
  `ARCHITECTURE.md` section 6.)
- **Change something about how a module works** (e.g. add a field to the dealer form):
  1. Add the column in Supabase (Table Editor → pick the table → add column, or a new
     SQL migration file).
  2. Add the field to the matching form component in `src/components/<module>/`.
  3. Add it to the matching `zod` schema in `src/lib/actions/<module>.ts` so it's
     validated and saved.
- **Something looks wrong / a page errors:** Vercel's dashboard (Deployments →
  your latest deployment → Functions/Logs) shows server errors. Supabase's dashboard
  (Logs → Postgres Logs) shows database errors.
- **Back up your data:** Supabase takes automatic daily backups on paid plans; on the
  free plan, periodically export via **Database → Backups** or run
  `pg_dump` against the connection string in Project Settings → Database.

## Keeping types in sync

`src/lib/types/database.types.ts` is hand-written to match the schema as of this
migration. It's a convenience for typing component props (`Dealer`, `Product`, etc.) —
it is **not** wired into the Supabase client as a strict generic, because a
hand-written approximation there produces confusing `never` type errors instead of
useful ones (see `ARCHITECTURE.md` section 3 note). Once your Supabase project exists,
you can generate the real thing and use it for stricter query typing if you want:

```bash
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/types/database.types.ts
```

If you do this, you'll also want to pass that type into `createBrowserClient<Database>`
and `createServerClient<Database>` in `src/lib/supabase/client.ts` / `server.ts`.

## Project structure

See `ARCHITECTURE.md` section 5 for the annotated folder tree and section 3 for the
full database schema reference.

## What's built vs. what's next

**Built (MVP):** Dashboard, Dealers, Inventory, Events, Tasks, authentication.

**Not yet built (Phase 2), but the database already supports it:** Sales reporting,
Purchase Orders/Import, Facilities/Brand Partnerships, Ambassadors, Marketing, plus
CSV/Excel import, Google Sheets sync, and e-commerce/inventory-system integrations. See
`ARCHITECTURE.md` sections 6–8 for what each of those needs.
