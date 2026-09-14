# KARNA / CORE

Karna Bhosle's reactor-inspired, single-page portfolio. The six anchored sections introduce Karna, his qualifications, AeroSense and CorpusAI, his exact CV skills, activities, and contact details. The visual design and original reactor/project SVG geometry came from Stitch MCP; see [design provenance](design/README.md).

## Run locally

Requires Node.js **22.12+** (tested on 24.12), npm, and MongoDB 8 or a MongoDB Atlas connection. Docker Desktop is optional. Run from the repository root:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
docker compose up -d mongo
npm run seed
npm run dev
```

Start Docker Desktop before the Compose command. Open **http://localhost:3000**; Express listens at **http://localhost:4000**. `npm run dev` builds and watches shared content, Next.js and Express together. Stop with Ctrl+C. Local MongoDB data persists in the `karna_mongo` Docker volume. `docker compose down` stops it while retaining that volume.

Without Docker, run a local MongoDB Community server and set `MONGODB_URI` to its database, or use an Atlas database with a dedicated database user and the correct network access rules. Do not point tests at the live portfolio database. If you only need to preview the page, run `npm run dev:web`: no API, database, SMTP or credentials are needed for rendering or building. Without database persistence, the form fails honestly and offers direct email.

## Architecture

```text
apps/web          Next.js App Router / React / Tailwind / Motion
apps/api          Separate Express process / Mongoose / Nodemailer
packages/shared   Strict Zod schemas, public types, canonical seed
tests/e2e         Playwright browser and axe accessibility checks
design/stitch     Unserved Stitch reference exports
```

Most page content is rendered by Server Components. Small client components manage navigation, motion, dialogs and the form. Next.js does not implement API routes for contact, database access or email. Its server fetches the allowlisted portfolio endpoint with a 1.8-second timeout and a 60-second cache; a failed fetch or invalid response uses the typed canonical seed. A frontend build never requires MongoDB. Browser form requests go directly to Express and have a 30-second timeout; uncertain network receipt does not reset the form or imply success.

Motion is optional, keyboard controllable, persisted locally when storage works, and initially respects `prefers-reduced-motion`. Decorative CSS loops pause outside the viewport and when the tab is hidden. Short Motion reveals leave server-rendered text visible before initialization, and static SVGs remain available without JavaScript. The page uses native vertical scrolling and anchors.

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
| `API_BASE_URL` | Next.js server | Internal address of Express for public content fetching. |
| `NEXT_PUBLIC_API_BASE_URL` | Browser | Publicly reachable Express origin; baked into the frontend build. |
| `SITE_URL` | Next.js server/build | Real public site origin. Leave blank locally; no example canonical or Person identity URL is emitted. |

For SMTP, obtain a provider's SMTP host, port and credentials, approve the sender as required by that provider, and populate the API environment. The visitor only controls a validated Reply-To address and plain-text body content. They cannot select the recipient, sender or raw email headers. There is no marketing signup or tracking. A real external test email has not been sent.

## API and contact truthfulness

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Public, secret-free database/email configuration status; 503 when the database is unavailable. |
| `GET /api/portfolio` | Strict allowlisted portfolio content; database content or canonical seed fallback. |
| `POST /api/contact` | Validated name, email, subject, message and optional empty `website` honeypot. |

HTTP 201 is returned **only after MongoDB saves the message**. SMTP is attempted afterward and its status is persisted as `pending`, `accepted`, `failed` or `not_configured`. SMTP acceptance does not prove inbox delivery. Failure or absent email configuration leaves the message saved and recommends direct email for urgent enquiries. Database failure returns 503 and never claims success. The browser retains the visitor's text on failure and prevents duplicate pending submissions. Network loss after saving may leave receipt uncertain; use direct email before retrying because there is no idempotency or background mail retry system.

The API includes Helmet, explicit CORS origins, strict shared schemas, length limits, a 32 KB JSON limit, a honeypot and five contact attempts per IP per 15 minutes. The memory rate-limit store is suitable for **one API instance**; replace it with a shared store before horizontal scaling. CORS is not an authentication or bot prevention system. Configure proxy trust only for a controlled proxy that sanitizes forwarding headers. Expose the API over HTTPS in deployment. Logs contain event codes, not enquiry bodies or credentials. Contact data has timestamps and notification indexes; there are no public message listing, content editing or admin endpoints. See [API operational details](apps/api/README.md).

## Content and assets

Edit only `packages/shared/src/seed.ts` to update content, rebuild, and run `npm run seed` against the intended database. The seed is idempotent and upserts the `main` content document. **It overwrites database portfolio content from the canonical seed**, so add approved asset references to that seed before reseeding. It does not delete contact messages.

All displayed skills and project descriptions come from Karna's CV and accompanying instructions. Repositories were not audited. Grades, grades-derived claims, unverified outcomes, unprovided social accounts and invented metrics are excluded from public schemas, content, metadata and API responses. Odoo's result, date and designation remain null.

Asset locations:

```text
apps/web/public/images/projects/
apps/web/public/images/certificates/
apps/web/public/resume/
```

Optional project `screenshot`, activity/training `certificate`, and profile `publicResume` fields default to `null`. Image assets use one strict schema:

```ts
{ path: '/images/certificates/code-icon.jpg', alt: 'Accurate description of the supplied certificate', width: 1600, height: 1100 }
```

The dimensions above illustrate the shape; replace them with the **actual file dimensions**. Add the approved KJ Somaiya image to the certificates directory and update `activities.achievements` record `code-icon`. Use `odoo-finale` for the Odoo image. Supply meaningful alt text and preserve the full image. Reseed/rebuild; layout components need no changes. Without an image, only “Certificate to be added” is shown. With an image, a native modal dialog supports keyboard focus containment, Escape, close and focus restoration. Project screenshots use the same asset shape and reserved dimensions; current abstract artwork is explicitly labeled illustrative.

Do not publish the supplied original CV: it contains grades. Leave `profile.publicResume=null` until Karna supplies a grade-free or explicitly approved file. The existing local CV was not copied here. A portrait, live demos and certificates are unnecessary for running the application.

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

`npm test` uses isolated repository doubles and mocked SMTP for validation, saved/failing persistence responses, mail outcomes, malformed requests, public allowlisting, rate limiting and configuration. `npm run test:integration` uses a temporary real MongoDB process and separate `karna_api_isolated_test` database for Mongoose records, status updates, timestamps, indexes and idempotent seeding. It never reads the live database URI. On the first integration run, `mongodb-memory-server-core` may download a compatible MongoDB test binary. For an installed executable, set `MONGOMS_SYSTEM_BINARY` to its full path. SMTP is always mocked in tests.

Browser tests start the frontend automatically and exercise anchors, active navigation, the mobile menu, form validation/pending/failure/saved states, reduced motion, JavaScript-disabled rendering, no overflow, and axe scans at 360, 768 and 1440 pixels. Contact responses are intercepted in those browser tests; real persistence is covered separately. Install the matching browser once if needed: `npx playwright install chromium`. Browser reports and screenshots are local ignored artifacts. See [verification results](VERIFICATION.md) for checks actually run; no Lighthouse score is claimed.

## Production deployment

1. Provision a private MongoDB database with a dedicated least-privilege application user. Configure backups and a contact-data retention/deletion process appropriate to your use.
2. Deploy `apps/api` as a separate long-running Node service. Install from the root lockfile with `npm ci`, build shared and API workspaces, and start `npm run start -w @karna/api`. Configure private database/SMTP variables, deliberate host/proxy settings and allowed frontend origin. Termination signals trigger graceful shutdown.
3. Deploy `apps/web` on a Next.js-compatible host with the monorepo root as install context. Build shared first, then `npm run build -w @karna/web`; start `npm run start -w @karna/web` where required. Set internal `API_BASE_URL`, public HTTPS `NEXT_PUBLIC_API_BASE_URL`, and the real `SITE_URL` **before building**. Do not bake localhost into a public build. Public metadata includes an original KB favicon and generated social-preview image, with no example canonical domain.
4. Seed the intended database from the same canonical content version. Confirm health, content and one authorized real submission after SMTP configuration; verify the saved record and SMTP state without equating acceptance with inbox delivery.

No hosting account, domain or personal asset has been published. Remaining inputs are production database/hosting configuration, a working SMTP sender/provider, a real site URL and any future approved resume, certificates or screenshots.

The lockfile pins published compatible dependency versions. ESLint 9 is pinned because the current Next.js React lint plugin fails with ESLint 10; this compatibility choice is documented instead of suppressing the crash.
