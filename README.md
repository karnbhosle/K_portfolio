# KARNA / CORE

Karna Bhosle's single-page portfolio. A first visit opens on an arc reactor: press the core, it charges with the repulsor sound and discharges into the portfolio. Six anchored sections follow: Know Karna, Qualifications, Projects, Tech matrix, Leadership & awards and Contact. Every fact on the page comes from Karna's CV through one typed content file; the API, the page and the structured data all read it.

## Run locally

Requires Node.js **22.12+** (tested on 24.12), npm, and MongoDB 8 or a MongoDB Atlas connection. Docker Desktop is optional. From the repository root:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
docker compose up -d mongo
npm run seed
npm run dev
```

Open **http://localhost:3000**; Express listens at **http://localhost:4000**. `npm run dev` builds and watches the shared package, Next.js and Express together. Stop with Ctrl+C. `docker compose down` stops MongoDB and keeps its `karna_mongo` volume.

To preview only the page, run `npm run dev:web`: no API, database, SMTP or credentials are needed to render or build it. Content then comes from the shared seed, and the contact form reports honestly that it cannot save.

**After changing content, run `npm run seed` again.** The API serves the stored database copy, so an older seed in MongoDB keeps showing old content until it is replaced.

## Architecture

```text
apps/web          Next.js 16 App Router, React 19, Tailwind CSS 3
apps/api          Express 5, Mongoose 9, Nodemailer
packages/shared   Zod schemas, public types and the canonical content seed
tests/e2e         Playwright browser and axe accessibility tests
tests/helpers     capture.mjs: screenshots of the running site for visual review
design/, resources/  Stitch design references (not served)
```

The page is a statically generated Server Component, revalidated every 60 seconds. Its server fetches `GET /api/portfolio` with a 1.8-second timeout and falls back to the typed seed, so a build never needs MongoDB and the site stays up when the API is down. Small client components handle the intro, navigation state, the mobile menu, motion and sound preferences, the skill filter, the AQI band explorer and the contact form.

### Frontend behaviour

- **Ignition intro.** Shown once per browser session, skipped for direct section links (`/#projects`) and for crawlers. "Skip intro", Escape, and "Replay intro" in the navigation all work. The page underneath is fully rendered and inert while the intro is up. With JavaScript off, the intro never appears.
- **Motion.** A pre-paint script applies the stored choice, or the OS reduced-motion setting, before anything renders. "Pause motion" stops every decorative loop and is remembered. Reduced motion replaces the ignition with a short cross-fade with no flash. Decorative loops pause while the tab is hidden, and the background reactor holds still on phones.
- **Layout.** Desktop gets a fixed section rail; below 1024px a sticky top bar shows the current section and opens a full-screen menu (a native `<dialog>` with focus return). Layouts are verified at 320, 360, 768 and 1440px and at 200% zoom.
- **Projects.** Each project shows its highlights, a responsive service-topology diagram, its processing pipeline, its stack and expandable implementation notes. AeroSense includes an interactive scale of India's CPCB AQI bands; it describes the public standard, not project measurements.
- **Tech matrix.** Every CV skill, grouped as on the CV. Choosing a project highlights the skills its stack uses.
- **Contact.** Client-side validation with the shared schema, inline errors linked to their fields, a saved draft that survives a reload, a honeypot, and honest outcomes for every response: saved (with the real email status), not saved, rate-limited (with the wait time) and unconfirmed. Each message carries an `Idempotency-Key`, so retrying after an unconfirmed send can never save it twice.

## Environment

Copy the examples as shown above; real `.env` files are ignored. No secrets belong in `NEXT_PUBLIC_*` variables.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Express | Private connection string; local example uses `karna_portfolio`. |
| `HOST`, `PORT` | Express | Defaults `127.0.0.1`, `4000`. For a container, bind `HOST=0.0.0.0` deliberately. |
| `ALLOWED_ORIGINS` | Express | Comma-separated exact browser origins, e.g. `http://localhost:3000`. No wildcard. |
| `TRUST_PROXY` | Express | Exact trusted reverse-proxy hop count. Default `0` for direct local traffic. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Express | SMTP provider connection; commonly 587/false (STARTTLS) or 465/true. |
| `SMTP_USER`, `SMTP_PASS` | Express | Provider credentials; optional for a trusted local relay. |
| `SMTP_FROM` | Express | Fixed provider-approved sender address. |
| `SMTP_TO` | Express | Fixed recipient; defaults to `karnabhosle223@gmail.com`. |
| `NOTIFY_RETRY_INTERVAL_MS` | Express | How often failed notifications are retried; default 5 minutes, `0` disables. |
| `NOTIFY_MAX_ATTEMPTS` | Express | SMTP attempts per message, default 5. |
| `API_BASE_URL` | Next.js server | Internal address of Express for content fetching. |
| `NEXT_PUBLIC_API_BASE_URL` | Browser | Public Express origin for the contact form, also added to the Content-Security-Policy. Baked in at build time; a production build without it tells visitors to email directly. |
| `SITE_URL` | Next.js server/build | Real public origin. Enables the canonical URL, sitemap entry and Person `url`. Leave blank locally. |

## API

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/health/live` | Liveness: 200 whenever the process is serving. |
| `GET /api/health` | Readiness: database and email configuration status; 503 while the database is unavailable. |
| `GET /api/portfolio` | Strict allowlisted content: the database copy when valid, else the canonical seed. Fields added since older content was stored get their defaults. |
| `POST /api/contact` | Validated name, email, subject, message and empty `website` honeypot. Optional `Idempotency-Key` header. |

HTTP 201 is returned **only after MongoDB saves the message**. SMTP is attempted afterwards and its outcome is stored as `pending`, `accepted`, `failed` or `not_configured`; acceptance never claims inbox delivery. A retry with the same `Idempotency-Key` returns the original receipt with `replayed: true` and HTTP 200, without saving or emailing again; reusing a key for a different message returns 409. Failed notifications are retried in the background with backoff (5, 15, 45 and 135 minutes) up to the attempt limit. Claims are atomic, so several API instances never send the same retry twice.

Every response carries an `X-Request-Id`, and server logs are JSON lines with event codes and request IDs, never enquiry text, addresses or credentials. The API also has Helmet, explicit CORS origins, a 32 KB body limit, strict shared schemas, the honeypot and five contact attempts per IP per 15 minutes. The in-memory rate-limit store suits **one API instance**; use a shared store before scaling out. See [API operational details](apps/api/README.md).

## Content and assets

Edit only `packages/shared/src/seed.ts`, rebuild, and run `npm run seed` against the intended database. The seed is idempotent and **overwrites** the stored `main` content document; it never touches contact messages.

Skills and project descriptions come from Karna's CV and accompanying instructions; the repositories were not audited. Grades, invented metrics, unverified outcomes and unprovided social accounts are excluded from schemas, content, metadata and API responses. The GitHub profile link is the account that owns both project repositories. Each project's `pipeline` lists its processing stages with only CV-backed detail. CorpusAI's model-to-stage mapping (XGBoost for risk classification, the dual-head LSTM for net-worth forecasting, K-Means and Isolation Forest for peer grouping and anomalies) follows the previous page copy; confirm it before publishing.

Optional assets use one strict shape and default to `null`:

```ts
{ path: '/images/certificates/code-icon.jpg', alt: 'Accurate description of the certificate', width: 1600, height: 1100 }
```

| Field | Effect when set |
| --- | --- |
| `profile.portrait` | A photo at the top of the Profile panel. |
| `projects[].screenshot` | A screenshot under the project summary. |
| `training[].certificate`, `activities.achievements[].certificate` | A "View certificate" button opening an accessible dialog. |
| `profile.publicResume` | Reserved; leave `null` until a grade-free resume is approved. |

Put files in `apps/web/public/images/projects/`, `apps/web/public/images/certificates/` or `apps/web/public/resume/`, use their **real** dimensions, then reseed and rebuild. Do not publish the original CV: it contains grades.

## Commands and verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
npm start
```

- `npm test`: request, idempotency, logging, retry-worker, notification and configuration tests with repository doubles and mocked SMTP.
- `npm run test:integration`: real Mongoose against a temporary MongoDB, covering records, attempt counting, idempotency indexes, atomic retry claims and seeding. It never reads the live database URI. The first run may download a MongoDB test binary; set `MONGOMS_SYSTEM_BINARY` to use an installed one.
- `npm run test:e2e`: starts the frontend and checks the intro, anchors and navigation, the mobile menu, motion and sound preferences, the skill filter, the AQI scale, the 404 page, no-JavaScript rendering, every contact-form outcome including idempotent retries, overflow at 320–1440px and 200% zoom, and axe WCAG 2.2 AA scans. Install the browser once if needed: `npx playwright install chromium`.
- `node tests/helpers/capture.mjs http://localhost:3000 360,768,1440`: screenshots for visual review in `test-results/capture`.

See [verification results](VERIFICATION.md) for the checks actually run. No Lighthouse score is claimed.

## Production deployment

1. Provision a private MongoDB with a least-privilege application user, backups, and a retention process for contact messages.
2. Deploy `apps/api` as a long-running Node service: `npm ci` from the root lockfile, build shared and API, then `npm run start -w @karna/api`. Configure database, SMTP, `ALLOWED_ORIGINS` and proxy trust deliberately, and expose it over HTTPS. Point liveness checks at `/api/health/live` and readiness at `/api/health`.
3. Deploy `apps/web` on a Next.js host with the monorepo root as install context. Set `API_BASE_URL`, the public HTTPS `NEXT_PUBLIC_API_BASE_URL` and the real `SITE_URL` **before building**. Production builds send a Content-Security-Policy, HSTS, `X-Frame-Options: DENY` and related headers.
4. Seed the database from the same content version. Confirm health, content and one authorized real submission, and check the stored notification status.

No hosting account, domain or personal asset has been published. Remaining inputs are production hosting, an SMTP provider, a real site URL, and any approved portrait, certificates or screenshots. The intro sound (`apps/web/public/audio/repulsor.mp3`) is a film sound effect clip; confirm you have the right to use it publicly or swap in a licensed sound.

ESLint 9 is pinned because the current Next.js React lint plugin fails with ESLint 10.
