# Express API notes

The root README covers full setup. From the repository root, run `npm run build -w @karna/shared` before running this workspace on its own. Copy `.env.example` to `.env` inside `apps/api`, configure MongoDB, then use `npm run dev -w @karna/api`. The production entry point is `npm run start -w @karna/api` after the root build.

The server starts even when MongoDB is absent and retries a configured connection every 15 seconds. Meanwhile `GET /api/health/live` stays 200, `GET /api/health` returns 503 with a degraded database status, `GET /api/portfolio` returns the shared canonical content, and `POST /api/contact` returns 503 without pretending to save. A failed portfolio read also falls back to canonical content. Connection and query timeouts bound every database wait.

## Contact contract

Submit JSON `{name,email,subject,message,website:""}` to `POST /api/contact`; `website` is an optional honeypot. Names take 2–100 characters, email at most 254, subjects 3–150 and messages 10–5,000. Unexpected fields, invalid addresses, line breaks in single-line fields and a filled honeypot are rejected. Bodies are limited to 32 KB and must be `application/json`. Validation errors return HTTP 400 with `received:false`, a message, and field errors where applicable.

HTTP 201 always means the message was persisted. The response contains `received:true`, `notification` and a plain-language `message`. The stored `notificationStatus` is one of:

- `pending`: saved before a configured SMTP attempt; also kept if recording the outcome fails or the server stops mid-attempt.
- `accepted`: the SMTP server accepted a recipient and that was saved. This does not prove inbox delivery.
- `failed`: the attempt failed or no recipient was accepted, and that was saved.
- `not_configured`: saved with no configured SMTP host, sender or recipient.

Email is never sent before the message is saved, and SMTP failure never discards a saved message.

### Idempotent retries

Send an `Idempotency-Key` header (16–128 letters, digits, `-` or `_`) to make a submission safely repeatable. The first request saves the message with the key and a SHA-256 fingerprint of its fields. A repeat with the same key and the same fields returns HTTP 200 with the original status and `replayed: true`, without saving or emailing again. A repeat with the same key and different fields returns 409. A unique partial index on the key also resolves two concurrent first attempts: one saves and the other replays. The web form sends a fresh random key for each distinct message and reuses it when the visitor retries an unconfirmed send.

### Notification retries

When SMTP is configured and `NOTIFY_RETRY_INTERVAL_MS` is above 0 (default 5 minutes), a background worker re-sends notifications that failed. Retries back off 5, 15, 45 and 135 minutes after successive failures, up to `NOTIFY_MAX_ATTEMPTS` attempts in total (default 5, counting the first one). A `pending` status older than 15 minutes is treated as an interrupted attempt and retried; if that earlier attempt actually reached the mail server, Karna may get a duplicate notification, which is safer than missing one. Each message is claimed with one atomic update, so several API instances never send the same retry twice. Failures recorded before this worker existed are retried once it starts.

SMTP uses a fixed configured sender and recipient. The subject is a fixed `Portfolio enquiry:` prefix followed by the visitor's subject, with control characters and line breaks removed. The visitor's address is used only as Reply-To, and their text goes into a plain-text body; they cannot set recipients, Bcc or headers. URL and file access are disabled. `SMTP_SECURE=true` normally pairs with port 465; port 587 normally uses `false` with STARTTLS. Connection and greeting timeouts are 5 seconds and the socket timeout 7 seconds.

## Persistence and operations

MongoDB holds a unique `Portfolio.key` singleton with the strict public content, plus timestamped `ContactMessage` records. Contact messages are indexed by date, by status and date, by status and next retry time, and by idempotency key (unique, keyed messages only). Visitor names and addresses are not indexed. Public responses parse the strict schema and never return MongoDB metadata, message records or unknown fields. `npm run seed` is idempotent: it upserts the `main` portfolio from the shared content and deliberately overwrites what was stored. No public content-editing or message-listing endpoint exists.

`ALLOWED_ORIGINS` is a comma-separated list of exact origins without trailing slash or path, such as `http://localhost:3000`. Wildcards are rejected. CORS allows the `Content-Type`, `Idempotency-Key` and `X-Request-Id` request headers, exposes `X-Request-Id`, `Retry-After` and the standard `RateLimit` headers, and caches preflights for 10 minutes. Helmet, strict validation, body limits, the honeypot and IP rate limiting complement CORS, which is not authentication.

Contact submissions are limited to five per IP per 15 minutes, invalid ones included. The in-memory store suits a single process and resets on restart; configure a shared store before scaling out. `TRUST_PROXY=0` is correct for direct traffic. Set an exact hop count only behind a trusted proxy that overwrites forwarded headers, otherwise clients can spoof IPs or share one limit.

Every response has an `X-Request-Id`. A well-formed incoming ID (8–64 letters, digits, `-` or `_`) is kept so traces can span services; anything else is replaced. Logs are one JSON object per line with time, level, event code and, where relevant, the request ID or attempt number. They never contain enquiry text, email addresses, connection strings, credentials or raw errors. SIGINT and SIGTERM stop the listener, finish any running retry, close MongoDB and enforce a bounded shutdown. A startup warning flags SMTP settings that are present but incomplete.

## Tests

`npm run test -w @karna/api` runs request, idempotency, logging, retry-worker and notification tests with isolated doubles. `npm run test:integration -w @karna/api` runs real Mongoose tests against an ephemeral MongoDB from `mongodb-memory-server-core`, covering records, attempt counting, the idempotency index, atomic retry claims and seeding. Test data uses a separate `karna_api_isolated_test` database and never reads `MONGODB_URI` or SMTP credentials. The first integration run downloads a MongoDB binary into the ignored `node_modules/.cache/mongodb-memory-server`; later runs reuse it, or set `MONGOMS_SYSTEM_BINARY` to an installed `mongod`. SMTP is always mocked.
