# Verification performed

Verified locally on 25 October 2026 with Node.js 24.12.0 on Windows, after the full-stack upgrade.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed with no errors or warnings. |
| `npm run typecheck` | Passed for shared, API and web. |
| `npm test` | 62/62 passed: requests, validation, idempotent replays and conflicts, request IDs and log hygiene, the retry schedule and worker, SMTP notifications (mocked) and configuration. |
| `npm run test:integration` | 7/7 passed against a temporary MongoDB 8.2.6: records and attempt counting, the unique idempotency index, oldest-first retry claims including legacy records, one winner among five concurrent claims, idempotent seeding and strict content validation. |
| `npm run test:e2e` | 29/29 Chromium tests passed. |
| `npm run build` | Shared, Express and Next.js production builds passed without an API or database. `/` is prerendered and revalidates every 60 seconds. |

## Browser coverage

The Playwright suite checks:

- **Intro:** shown once per session, keyboard ignition, the inert page behind it, focus moving to the heading afterwards, skip by button and Escape, replay, no intro on deep links, and a remembered sound preference.
- **Structure and navigation:** section order and anchors, active-section state in the rail, the mobile menu's keyboard use, focus return and closing on navigation, and implementation notes opening from the keyboard.
- **Interactive sections:** the tech-matrix project filter and the AQI band scale.
- **Motion:** reduced motion on first load, the persisted motion toggle, and the background reactor running only while motion is on.
- **No JavaScript:** content renders, the intro never appears, direct email and phone links work, and the form cannot submit or put personal data in the URL.
- **Layout and accessibility:** no horizontal overflow and no visible element past the viewport at 320, 360, 768 and 1440px or at a 200% zoom equivalent. axe WCAG 2.0–2.2 A/AA scans pass at all four widths and on the intro.
- **Contact outcomes (responses intercepted):**
  - The send button stays disabled while pending; an invalid email is caught before any request.
  - A save failure or an HTML gateway error keeps the visitor's text and shows direct email.
  - Retrying after an unconfirmed send reuses the same `Idempotency-Key`; a changed message gets a new one.
  - A 429 shows the wait time; server field errors appear inline.
  - Saved, failed and not-configured email statuses are reported honestly, and an unsent draft survives a reload.
- **404:** unknown paths return a branded 404 page.

## Production and full-stack checks

- **Production server:** `next start` served `/` (prerendered), a 404 page, `apple-icon`, `icon.svg`, `manifest.webmanifest`, `opengraph-image`, `robots.txt`, `sitemap.xml` and the intro audio. Responses carried the Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy` and the other security headers. Playing the full intro and scrolling the page at 1440 and 390px raised no console errors or CSP violations.
- **Full stack:** the built API ran against a throwaway MongoDB on port 27018, not the developer database. Health and liveness answered.
  - A keyed submission saved (201).
  - The same key replayed the receipt (200, `replayed: true`) without a second record.
  - The same key with a different message was refused (409).
  - A message sent through the real browser form crossed the CORS preflight with its `Idempotency-Key` and was stored with its key and fingerprint.
- **Visual review:** screenshots at 320, 360, 390, 768 and 1440px were inspected section by section.

## Not verified

- A real SMTP provider and inbox delivery: SMTP was mocked or unconfigured throughout, and no email was sent.
- Hosting, domain and TLS.
- Lighthouse scores.
- Screen readers other than the accessibility tree that axe and Playwright inspect.
- Real phones (only emulated viewports).
- Docker Compose: MongoDB ran from the cached binary instead.
