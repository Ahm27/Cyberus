# Cyberus Challenges

Cyberus Challenges is a production-oriented, mobile-first mini-CTF for Cyberus Orientation Day. It contains exactly ten beginner challenges. Participants solve any three in any order to unlock one physical-prize claim, and may continue to 10/10. It is separate from “Hack the Orientation.”

## Architecture

The application is a single Next.js 15 deployment with React Server Components and small client islands. Route handlers own registration, sessions, flag validation, simulated challenge interactions, staff redemption, and administration. PostgreSQL is accessed only through Prisma. IndexedDB and a small service worker provide a separate trust-based offline experience.

Intentional vulnerabilities live in `src/lib/challenge-engine.ts`. This engine only compares input with allowlisted training values and returns fictional data. It does not execute SQL, read participants, consume real cookies/roles, scan a network, or route into administration.

Online challenge flags are generated from `crypto.randomBytes` per participant and challenge instance. The database stores a peppered SHA-256 validation hash and an AES-256-GCM ciphertext used only by the server to construct the isolated challenge. Refresh restores the active instance. An admin can intentionally rotate an unsolved instance; this invalidates its predecessor. Flag submission uses constant-time comparison and rate limits.

Participant and staff sessions use opaque random tokens in `HttpOnly`, `SameSite=Lax` cookies. Only token hashes are stored. Mutation routes check request origin and validate input with Zod. Staff passwords use bcrypt. Security headers are configured in `next.config.ts`.

Prize creation has a unique participant constraint and runs in the solve transaction. Redemption uses a conditional `claimedAt: null` update inside a transaction and writes an audit record, so competing redemptions cannot both succeed.

## Setup

Requirements: Node.js 20+, npm, and PostgreSQL 15+.

```bash
cp .env.example .env
openssl rand -hex 32 # use this output for FLAG_ENCRYPTION_KEY
openssl rand -base64 48 # use this output for SESSION_PEPPER
npm install
npm run db:generate
npm run db:migrate -- --name initial
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed command creates the event, config, all ten challenges, and an admin only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. Staff sign in at `/staff/login`; participant registration is `/register`; the offline pack is `/offline`.

### Environment variables

- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_PEPPER`: at least 32 random characters; changing it invalidates sessions and hashes.
- `FLAG_ENCRYPTION_KEY`: exactly 64 hexadecimal characters (32 bytes). Back this up securely; changing it makes active flag ciphertext unreadable.
- `NEXT_PUBLIC_APP_URL`: canonical public URL, used for QR links.
- `EVENT_SLUG` and `EVENT_NAME`: active event identity.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: development/setup admin used by `db:seed`. Do not keep a production password in source control.

## Workflows

Online participants register with a unique normalized University ID, receive an opaque session, and choose any challenge. Each active participant/challenge pair receives one stable dynamic instance. A correct server-validated flag creates one unique solve. The third solve creates exactly one claim. The dashboard shows the code and claim QR; later solves and refreshes reuse it.

Staff can look up a claim code or University ID at `/staff/claim`, see private participant details in the protected area, and atomically redeem it. The same screen registers manually verified offline participants. Offline records are explicitly labelled and cannot silently become online progress. Database constraints prevent duplicate offline IDs and duplicate University IDs within offline claims; staff logic also rejects an already redeemed online identity.

Admins at `/admin` can see participation, solve, eligibility, claim, and per-challenge metrics; toggle the leaderboard; edit/disable challenges; print the platform QR; and rotate an unsolved participant instance. Public `/leaderboard` queries aliases and solve counts only.

Offline mode generates `OFF-XXXXXX`, ten local random flags, challenge state, timestamps, solves, and eligibility in IndexedDB. It never requires registration, never posts solves, and tells participants to show the screen to HR. Anyone with device inspection skills can alter offline state; this is an accepted trust limitation, not cryptographic verification.

## Validation and deployment

```bash
npm run format:check
npm run lint
npm run typecheck
npm run db:validate
npm test
npm run build
npm start
```

To run the PostgreSQL constraint and concurrency suite against a disposable test database:

```bash
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyberus_test" npm test
```

Deploy behind HTTPS with a managed PostgreSQL database and set all production variables in the host’s secret store. Run `npm run db:deploy` and `npm run db:seed` during a controlled release. Use at least two application replicas only after replacing the in-memory rate limiter with a shared Redis-backed limiter. Put a CDN in front of static assets, retain database backups and audit logs, disable public source maps, and rotate setup credentials after creating staff accounts.

The included unit suite validates flag/session primitives, all ten isolated challenge paths, non-leakage in initial puzzle payloads, and the planned catalog. The optional PostgreSQL integration suite validates participant/session persistence, normalized-ID uniqueness, stable active instances, per-participant flags, solve uniqueness, one-claim enforcement, concurrent redemption, and leaderboard projection. Full cookie and IndexedDB browser checks still require a browser suite in the deployment environment. Before event day, run a staging rehearsal on the target hosting/database platform, including offline operation on iOS Safari and Android Chrome.

## Known limitations

- Offline progress is intentionally user-controlled and manually verified.
- The default rate limiter is process-local; distributed production needs shared state.
- The service worker caches only static/page-shell GET responses and never API responses. Users should load Offline Mode once before entering a known dead zone.
