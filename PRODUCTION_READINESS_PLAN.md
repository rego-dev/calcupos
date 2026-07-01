# CalcuPOS — Production Readiness & Security Plan

> Status: **NOT production-ready.** Naay kritikal nga auth/security holes nga dapat ayuhon una
> sa deploy. Kini nga dokumento mao ang plano — walay code nga giusab pa.
> Petsa: 2026-07-01

---

## 1. Executive Summary

CalcuPOS kay usa ka Next.js 16 + Prisma (PostgreSQL) nga POS system. Gamhanan ang
feature set (orders, inventory, warehouses, pre-orders, sales, users/roles, logs),
pero ang **authentication ug authorization layer kay fundamentally insecure** — dili ni
pwede i-deploy sa prod hangtod maayo ang Phase 0.

**Verdict:** Feature-complete-ish, pero **hindi** safe/secure. 3 ka phase para maka-abot sa
"safe and secure, ready to deploy."

---

## 2. Kritikal nga findings (evidence)

### P0-1 — Session cookie kay raw user ID (account takeover)
- `src/app/api/auth/login/route.ts:49` → `cookieStore.set('session', user.id, ...)`
- `src/lib/auth-actions.ts:41` → `cookieStore.set("session", String(user.id), ...)`
- `src/lib/auth-server.ts:13` → `parseInt(sessionId)` lang ang validation.
- **Epekto:** Bisan kinsa mo-set `session=1` sa browser → naka-login as user #1 (kasagaran admin).
  Walay password needed. **Full account takeover.**

### P0-2 — API routes walay auth/authorization
- Grep sa `getCurrentUser`/`checkPermission` sa `src/app/api/**` → **ZERO** hits.
- `src/app/api/users/route.ts` → `GET` mo-return sa tanang users; `POST` maka-create ug admin.
  Publicly callable, walay session.
- Parehong problema: `customers`, `inventory`, `orders` API routes.

### P0-3 — Password hashes leaked to client
- `src/app/(app)/users/actions.ts:26` → `password: user.password` gi-apil sa return.
- Kombinado sa P0-2, makuha sa unauthenticated `GET /api/users` → offline cracking.

### P0-4 — Debug endpoint live, walay auth
- `src/app/api/debug-check-db/route.ts` → mo-dump ug DB rows, walay guard.

### P0-5 — Middleware auth bypass + presence-only check
- `middleware.ts:26-28` → kung POST ug walay session, `next()` (dumaan gyud).
- `middleware.ts:6-7` → cookie **presence** lang gi-check, dili validity/signature.

### P0-6 — Cookie `secure` flag halos permi false
- `login/route.ts:51` ug `auth-actions.ts:42` → `secure` naka-depende sa
  `NEXT_PUBLIC_APP_URL?.startsWith('https')` nga dali dili maset → cookie ma-sniff sa HTTP.
  Wala poy `sameSite` → CSRF exposure.

### P1 — Build health
- `next.config.ts:8` → `typescript.ignoreBuildErrors: true`; naay `ts_errors.txt` (~30KB errors).
- **55 ka debug/fix/test scripts** sa repo root + committed logs (`error_debug.log` 60KB,
  `debug.log`, `errors.txt`, `error.json`) + daghang `.sql` files. Kauban ang delikado nga
  `clear-all-data.js`, `cleanup-duplicates.js`.
- Duha ka login implementation (route.ts + auth-actions.ts) — dapat usa lang.

### ✅ Maayo na
- `.env` **wala** na-commit sa git history (na-verify via `git log --all -- .env`).
- Bcrypt gigamit para password hashing.
- `.gitignore` mo-cover na sa `.env*`.

---

## 3. Ang plano (per phase, per file)

### PHASE 0 — Security (BLOCKER sa deploy)

**0-A. Ilisan ang session mechanism → signed/encrypted cookie**
Rekomendasyon: **`iron-session`** (encrypted + signed stateless cookie, way dugang DB table,
ni-scale, dali i-integrate sa server actions ug route handlers). Alternatibo: `jose` (JWT).

- Bag-o: `src/lib/session.ts` — `getIronSession` config (secret gikan sa env `SESSION_SECRET`),
  helper `createSession(userId)`, `getSession()`, `destroySession()`.
- Usab `src/lib/auth-actions.ts` (`login`, `logout`) → gamiton ang bag-ong session helper
  imbes raw ID cookie.
- Usab `src/app/api/auth/login/route.ts` → **konsolidahon** sa server action o himuong signed session.
  (Decision: usa ra ka login path — tangtangon ang duplicate.)
- Usab `src/lib/auth-server.ts` `getCurrentUser()` → basahon gikan sa signed session, dili `parseInt`.
- Env: idugang `SESSION_SECRET` (>=32 chars) sa `.env` + `.env.example`.

**0-B. Central auth guard para sa tanan API routes + server actions**
- Bag-o: `src/lib/require-auth.ts` — `requireUser()` (mo-throw/401 kung walay session),
  `requirePermission(key)` (mo-check `checkPermission`).
- Butangan tanan API route sa `src/app/api/**` (except `/api/auth/login`) ug `requireUser()`
  sa sinugdanan; idugang `requirePermission('users')` sa `/api/users`, etc.
- Audit ang 15+ server action files (`src/app/(app)/**/actions.ts`) — mutation actions dapat
  mo-tawag ug `requirePermission(...)` una mag-DB write. (Listahan sa Appendix A.)

**0-C. Tangtangon ang password leak**
- `src/app/(app)/users/actions.ts` `getUsers()` + tanan user-returning functions → tangtangon
  ang `password` field (gamit Prisma `select` o `omit`). I-audit ang uban `findMany({include:...})`.

**0-D. Tangtangon/gate ang debug endpoints**
- Delete `src/app/api/debug-check-db/route.ts` (o i-gate ug `requirePermission('adminManage')`
  ug i-disable sa production via env flag).

**0-E. Ayohon ang cookie flags + middleware**
- `secure: process.env.NODE_ENV === 'production'` (dili na naka-depende sa APP_URL),
  idugang `sameSite: 'lax'`.
- `middleware.ts` → tangtangon ang blanket POST bypass; kung mag-guard ug server actions sa
  server side (0-B), luwas na. I-consider ang lightweight signature check sa middleware.

**0-F. Login rate limiting**
- Simple in-memory o Upstash/Redis-based limiter sa login (e.g. 5 attempts / 15 min / IP+email).
- Idugang generic error message (naa na — "Invalid email or password"). Maayo.

### PHASE 1 — Build health & repo hygiene

**1-A. Type safety**
- Tangtangon `typescript.ignoreBuildErrors: true` sa `next.config.ts`.
- Dagan `npm run typecheck`, ayohon ang totoong errors (i-triage gikan sa `ts_errors.txt`).
- Tangtangon ang daghang `(prisma as any)` casts kung mahimo (regenerate Prisma client).

**1-B. Repo cleanup**
- Ibalhin ang mga operational script padulong `/scripts/` (ug i-document), o tangtangon ang
  one-off nga `fix*.js`, `debug*.js`, `tmp_*.js`, `check*.js`, `test-*.js` (~55 files).
- Tangtangon/i-gitignore ang committed logs: `debug.log`, `error_debug.log`, `errors.txt`,
  `error.json`, `ts_errors.txt`, `typecheck_output*.txt`, `query`, `.modified`.
- Idugang sa `.gitignore`: `*.log`, `/logs/`.
- Konsolidahon ang loose `.sql` files padulong `prisma/migrations/` o `docs/`.

### PHASE 2 — Hardening & ops

**2-A. Security headers**
- Sa `next.config.ts` `headers()`: HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, ug base nga CSP.

**2-B. Input validation**
- Gamit Zod (naa na sa deps) sa tanan API route bodies + server action inputs.
  Karon direkta `body.email` etc. nga walay schema.

**2-C. Env validation + config**
- Bag-o: `src/lib/env.ts` — validate `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` sa boot.
- Health check endpoint `/api/health` (DB ping).
- Structured error logging (tangtangon ang bulk `console.error`; consider Sentry).

**2-D. Tests + CI**
- Auth tests (session forgery dapat ma-reject, permission gates).
- Smoke tests sa critical flows (login, create order, inventory adjust).
- GitHub Actions: `typecheck` + `lint` + `build` + tests kada PR.

---

## 4. Sunod-sunod nga rekomendasyon

1. **Phase 0 sa** — walay lain, kay tanan P0 kay direktang exploitable.
2. Sugdan sa **0-A (session) + 0-B (guards)** magkuyog kay nagsalig sila.
3. Dayon 0-C..0-F (dali ra).
4. Phase 1 (cleanup) para hapsay ang succeeding work.
5. Phase 2 (hardening) para sa long-term "safe & secure" claim.

**Estimate:** Phase 0 ≈ core nga trabaho (1–2 focused sessions). Phase 1 ≈ dali. Phase 2 ≈ incremental.

---

## Appendix A — API routes & server actions na kailangan i-guard

**API routes (`src/app/api/**`) — tanan kailangan `requireUser`, uban `requirePermission`:**
- `auth/login` (public — exempt), `auth/me`
- `users` (`requirePermission('users')`), `users/[id]`
- `customers`, `customers/[id]`
- `inventory`, `inventory/[id]`
- `orders`, `orders/[id]`
- `chat-events`
- `debug-check-db` (delete o gate)

**Server action files (`src/app/(app)/**/actions.ts`) — audit mutations:**
- `users/actions.ts`, `customers/actions.ts`, `inventory/actions.ts`, `orders/actions.ts`,
  `pre-orders/actions.ts`, `sales/actions.ts`, `branches/actions.ts`, `profile/actions.ts`,
  `bodega/inventory/actions.ts`, `admin/inventory-logs/actions.ts`, ug `src/actions/*.ts`.

---

## Appendix B — Decision log
- **Session:** iron-session (encrypted stateless cookie) — recommended default.
- **Login path:** konsolidahon padulong usa ka implementation; tangtangon ang duplicate.
