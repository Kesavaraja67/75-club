# Contributing to 75 Club

Thank you for your interest in contributing. Every meaningful contribution — bug fix, feature, test, or documentation improvement — is welcome.

---

## Setup

> Full setup instructions are in [README.md](README.md). Here's the short version.

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/the-bunk-planner-web.git
cd the-bunk-planner-web
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY at minimum
npm run dev
```

---

## Branches & Git Rules

| Rule                                               | Why it matters                                                                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Never force-push to a shared or open PR branch** | Force-pushing rewrites history, breaking every other contributor's local copy of that branch and making the PR review diff unusable.                                                               |
| **Do not rebase open PR branches**                 | Rebasing changes commit SHAs; it makes the review history impossible to follow and invalidates any previous approvals. Use a merge commit (`git merge main`) to bring in upstream changes instead. |
| **One feature / fix per PR**                       | Keeps reviews focused and rollbacks clean.                                                                                                                                                         |

### Branch naming

```
feat/short-description     # new feature
fix/short-description      # bug fix
chore/short-description    # deps, tooling, refactor
docs/short-description     # documentation only
```

---

## Before Opening a PR

Run all four checks locally — they will also run in CI and a failing build blocks merge:

```bash
npm run type-check   # TypeScript — must pass
npm run lint         # ESLint   — must pass
npm test             # Vitest   — must pass
npm run build        # Turbopack production build — must pass
```

---

## Commit Style (Conventional Commits)

```
feat(dashboard): add subject drag-and-drop reordering
fix(pwa): resolve cold-start blank screen on iOS
docs(readme): update database migration steps
chore(deps): bump next to 16.2.0
```

Format: `type(scope): short description` — keep it under 72 characters.

---

## Pull Request Template

When you open a PR, your description **must include**:

### ✅ Checks passed

List which of the four CI checks pass locally. If any fail, explain why.

```
- [x] type-check
- [x] lint
- [x] test
- [ ] build — failing because of X (being fixed in next commit)
```

### 📸 Screenshots / Recording

- For **any UI change** — before & after screenshots are required.
- For **complex interactions** (animations, payment flow, PWA install) — a short screen recording is strongly preferred.
- For **backend-only / pure logic changes** — screenshots are not required, but paste relevant log output or test results.

### 📝 Description

Briefly explain _what_ changed and _why_. Link any related issue with `Closes #123`.

---

## What to Work On

Browse the [Issues](../../issues) tab. Start with `good first issue` or `help wanted` labels.

High-value contribution areas:

- 📱 **PWA edge cases** — iOS Safari, offline behaviour
- 🧪 **Tests** — more unit tests in `lib/`, Playwright E2E
- ♿ **Accessibility** — ARIA, keyboard navigation, focus management
- 🐛 **Bug fixes** — anything labelled `bug`

---

## Code Style

- **TypeScript everywhere** — no `any` unless `eslint-disable` is explicitly justified in a comment
- **Tailwind CSS** for styling — no arbitrary inline styles in components
- **Pure functions in `lib/`** — keep calculation logic out of components; it stays testable
- **Shadcn/UI** for new primitives — do not add new UI libraries without a discussion first

---

## Questions?

Open a [Discussion](../../discussions) or ping `@Kesavaraja67` in your PR.
