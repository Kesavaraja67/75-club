# Contributing to 75 Club

First off, thank you for taking the time to contribute! 🎉

## Quick Start (Local Setup)

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- A [Supabase](https://supabase.com) project (free tier is fine)
- Optional: Gemini AI API key, Razorpay test account

### Steps

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/the-bunk-planner-web.git
cd the-bunk-planner-web

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key at minimum

# 4. Run the database migrations
# Go to your Supabase project → SQL Editor and run the .sql files in this order:
#   supabase_schema.sql
#   supabase_migration_phase2.sql
#   supabase_migration_calendar.sql
#   supabase_migration_timetable.sql
#   supabase_payment_migration.sql

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app should load without AI or payment features.

> **Minimum viable setup:** You only _need_ `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. AI scan and Razorpay payments will be disabled without their keys.

---

## Development Workflow

### Branch Naming

```
feat/short-description     # New feature
fix/short-description      # Bug fix
chore/short-description    # Tooling, deps, refactor
docs/short-description     # Documentation only
```

### Before Submitting a PR

```bash
npm run type-check   # TypeScript — must pass
npm run lint         # ESLint — must pass
npm test             # Vitest unit tests — must pass
npm run build        # Production build — must pass
```

All four checks also run automatically in GitHub Actions on every PR.

### Commit Style

We follow **Conventional Commits**:

```
feat(dashboard): add subject reorder drag-and-drop
fix(pwa): resolve cold-start blank screen on iOS
docs(readme): update setup instructions
chore(deps): bump next to 16.2.0
```

---

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  (auth)/               # Login, signup, forgot password
  dashboard/            # Protected dashboard routes
  api/                  # API route handlers
components/
  attendance/           # AttendanceCard, subject cards
  dashboard/            # StatsGrid, ManualSubjectDialog
  pwa/                  # PWALoadingGuard, install prompts
  scan/                 # AI timetable scanner UI
  layout/               # Sidebar, MobileNav, Navbar
  ui/                   # Shadcn/UI base components
lib/
  attendance.ts         # Pure attendance calculation functions ← testable core
  subscription.ts       # Free vs Pro tier logic
  supabase/client.ts    # Browser Supabase client
  supabase/server.ts    # Server Supabase client
  types.ts              # Shared TypeScript types
public/
  sw.js                 # Hand-written service worker
  manifest.json         # PWA manifest
.github/workflows/
  ci.yml                # GitHub Actions CI pipeline
```

---

## What to Work On

Check the [Issues](https://github.com/Kesavaraja/the-bunk-planner-web/issues) tab. Good first issues are labelled `good first issue`.

Common areas where contributions are very welcome:

- 📱 **PWA improvements** — iOS Safari edge cases, better offline experience
- 🧪 **Tests** — More unit tests for `lib/`, Playwright E2E tests
- 🌐 **Accessibility** — ARIA labels, keyboard navigation
- 📝 **Docs** — Clearer setup instructions, architecture notes
- 🐛 **Bug fixes** — Issues labelled `bug`

---

## Code Style

- **TypeScript** for everything — no `any` unless absolutely necessary
- **Tailwind CSS** for styling — no inline styles except in server components
- **Shadcn/UI** for new UI components — check existing components before adding dependencies
- All new calculation logic in `lib/` (pure functions) — not inside components

---

## Questions?

Open a [Discussion](https://github.com/Kesavaraja/the-bunk-planner-web/discussions) or tag `@Kesavaraja` in your PR.
