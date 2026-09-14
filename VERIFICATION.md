# Verification performed

Verified locally on 14 September 2026 with Node.js 24.12.0 on Windows.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no errors or warnings. |
| `npm run typecheck` | Passed for shared, API and web. |
| `npm test` | 34/34 request, validation, configuration and mocked SMTP tests passed. |
| `npm run test:integration` | 4/4 actual Mongoose/MongoDB tests passed. |
| `npm run test:e2e` | 17/17 Chromium Playwright tests passed. |
| `npm run build` | Shared, Express and optimized Next.js production builds passed without a live API/database. |
| Production smoke check | `npm start`: page and social image 200; portfolio API 200 from seed; health and contact 503 with database unconfigured, `received:false`. |

The Next.js build warns that `metadataBase` is unset because no real `SITE_URL` was supplied. Next uses its local origin for the development social-image URL; the application emits no invented canonical URL or Person identity URL. Set the actual `SITE_URL` before deployment.

Browser checks covered exact section/anchor order, active navigation, mobile menu and Escape/focus restoration, visible contact actions, native keyboard-expanded project details, reduced motion on first load, motion preference persistence, actual offscreen reactor-loop pausing, and readable server-rendered content without JavaScript. With JavaScript disabled, the contact button stays disabled and cannot append personal fields to a URL.

Contact browser checks intercepted Express responses to verify pending-state duplicate prevention, client and server field errors, retained messages on persistence/network/invalid-response failure, and truthful saved/SMTP notification states. They did not send email. Backend tests separately exercised real Mongoose persistence, status updates, timestamps, indexes and repeated seed upserts against temporary MongoDB 8.2.6 storage. They never used the real portfolio database or submission data. The MongoDB binary download initially stalled but later completed; ordinary integration tests now pass using the local cache.

Axe WCAG 2/2.1 A/AA scans and overflow checks passed at **360, 768 and 1440 CSS pixels**. Screenshots of the actual page were inspected at those sizes. A **200% zoom-equivalent reflow** check used 720 CSS pixels at device scale factor 2; this is a layout simulation of a 1440-pixel desktop at 200%, not a claim of browser-chrome zoom automation. No Lighthouse measurement was run.

Computed contrast ratios using WCAG relative luminance:

| Pair | Ratio |
| --- | --- |
| Primary text `#EFF8FF` / page `#060B12` | 18.36:1 |
| Secondary text `#A7BACB` / surface `#101A25` | 8.80:1 |
| Copper `#C98A45` / surface `#101A25` | 6.02:1 |
| Dark button label `#060B12` / cyan `#61E8FF` | 13.62:1 |
| Input border `#56758C` / surface `#101A25` | 3.61:1 |

Remaining external verification: a user-configured SMTP provider and authorized real notification, real hosting/domain/TLS configuration, and future supplied certificate/screenshot/resume assets. Docker Compose was provided but not started because Docker Desktop's daemon was unavailable; MongoDB integration tests used an isolated executable instead. No deployment, external email, or public asset upload was performed.
