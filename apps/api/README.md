# Express API notes

The root README contains the full application setup. From the repository root, run `npm run build -w @karna/shared` before running this workspace by itself. Copy `.env.example` to `.env` inside `apps/api`, configure MongoDB, then use `npm run dev -w @karna/api`. The production entry point is `npm run start -w @karna/api` after the root build.

The server intentionally starts when MongoDB is absent. It retries a configured MongoDB connection every 15 seconds. `GET /api/health` returns HTTP 503 with a degraded database status, `GET /api/portfolio` returns the shared canonical public content, and `POST /api/contact` returns HTTP 503 without pretending to save a message. A failed portfolio database read also falls back to canonical content. Connection and read timeouts bound database waits.

## Contact contract

Submit JSON `{name,email,subject,message,website:""}` to `POST /api/contact`; `website` is an optional honeypot. Names accept 2–100 characters, email at most 254, subjects 3–150, and messages 10–5,000. Unexpected fields, invalid email addresses, single-line control characters, and nonempty honeypots are rejected. Payloads have a 32 KB body limit. Validation errors return HTTP 400 with `received:false`, a message, and field errors where applicable. Requests require `application/json`.

HTTP 201 always means the message was persisted to MongoDB. The response contains `received:true`, `notification`, and plain-language `message`. The persisted `notificationStatus` is one of:

- `pending`: saved before a configured SMTP attempt; also retained if recording the SMTP result fails or the server shuts down mid-attempt.
- `accepted`: the SMTP server accepted a recipient and that status was saved. This does not prove inbox delivery.
- `failed`: the SMTP attempt failed or accepted no recipient, and that result was saved.
- `not_configured`: the message was saved with no configured SMTP host/sender/recipient.

The application never sends email before the message is saved. SMTP failure does not discard a saved message. A notification status write failure returns a saved receipt with `pending`, advising direct email. There is no background SMTP retry worker or inbox-delivery tracking. Never resubmit a saved enquiry merely because the SMTP notification failed. Network failures can leave the browser uncertain whether a request was saved; there is no idempotency-key system, so direct email is preferable before repeating an uncertain submission.

SMTP uses a fixed configured sender and recipient, a fixed subject, and the validated visitor email only as Reply-To. Visitor text goes into a plain-text body; it cannot set recipient, Bcc, or mail headers. URL and attachment file access are disabled. `SMTP_SECURE=true` normally pairs with port 465; port 587 normally uses `false` with STARTTLS negotiated by Nodemailer. Provider-approved `SMTP_FROM`, `SMTP_HOST`, and optional authentication must be supplied. Credentials are used only by Express. Connection/greeting timeouts are 5 seconds and the SMTP socket timeout is 7 seconds.

## Persistence and operations

MongoDB has a unique `Portfolio.key` singleton containing the shared strict public-content document, plus separate timestamped `ContactMessage` records with chronology and notification-status indexes. Public responses parse the strict schema and never return MongoDB metadata, message records, or unrecognized fields. `npm run seed` is idempotent: it upserts the `main` portfolio from shared canonical content. It deliberately overwrites that content with the seed; update the shared seed before seeding newly approved assets. No public content editing or contact-list endpoint exists.

`ALLOWED_ORIGINS` is a comma-separated list of exact origins, without trailing slash or paths, such as `http://localhost:3000`. Wildcards are rejected. Helmet, strict shared input validation, body limits, a honeypot, and IP rate limiting complement CORS. Clients without Origin remain supported; CORS is not authentication or comprehensive bot prevention.

Contact submissions are limited to five requests per IP per 15 minutes, including invalid submissions. The in-memory rate-limit store is suitable for a single API process; it resets on restart and is not shared across replicas. Configure a shared external rate-limit store before horizontal scaling. `TRUST_PROXY=0` is correct for direct local traffic. Set a precise hop count only when a trusted reverse proxy is actually in front of the API and strips or overwrites incoming forwarded headers. Incorrect proxy trust can allow clients to spoof IPs or cause all users to share a rate limit. Production should expose the API only behind the intended TLS proxy and configure its origin and host deliberately.

Logs contain event codes only, without enquiry bodies, email addresses, MongoDB URIs, SMTP credentials, or raw errors. SIGINT/SIGTERM stop the listener, close MongoDB, and enforce a bounded shutdown. Keep real environment files private. Apply database access controls and an appropriate retention process to stored enquiries; no visitor tracking or newsletter subscription is present.

## Tests

`npm run test -w @karna/api` runs request and notification tests with injected isolated doubles. `npm run test:integration -w @karna/api` separately runs real Mongoose integration tests using an ephemeral MongoDB process from `mongodb-memory-server-core`. Test records use a separate `karna_api_isolated_test` database and never use `MONGODB_URI` or SMTP credentials. The first integration-test run downloads a MongoDB test binary into the repository's ignored `node_modules/.cache/mongodb-memory-server` directory; it requires access to the MongoDB download host and a supported host. Later runs reuse the cached binary. Alternatively set `MONGOMS_SYSTEM_BINARY` to an installed compatible `mongod` executable. The core package avoids downloading MongoDB during ordinary dependency installation. SMTP is always mocked in tests.
