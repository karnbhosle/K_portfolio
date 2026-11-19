# Host Karna's portfolio for free: beginner walkthrough

Repository: [karnbhosle/K_portfolio](https://github.com/karnbhosle/K_portfolio)

Guide checked: **20 November 2026**

Follow the steps in order. Each stage has a checkpoint: fix a failed checkpoint before continuing. Hosting dashboards and free plans can change, so no guide can guarantee zero errors; this guide provides the exact settings for this repository and ways to recover from common failures.

## 1. What you are hosting, and the free stack

This repository contains three connected parts:

- **Website:** Next.js 16, React 19, TypeScript and Tailwind CSS. Host it on **Vercel Hobby**.
- **API:** Node.js and Express. This receives contact form submissions. Host it as a **Render Free Web Service**.
- **Database:** MongoDB. Use a **MongoDB Atlas Free/M0 cluster** to keep messages after the API restarts.
- **Source code:** Keep it in the existing **GitHub** repository. Vercel and Render deploy changes from its `main` branch.
- **Live air-quality data:** The existing website uses **Open-Meteo**. No additional key is required for the current integration. Keep its attribution visible and follow its [usage terms](https://open-meteo.com/en/terms).
- **Addresses and HTTPS:** Use the hosting providers' `vercel.app` and `onrender.com` addresses. No purchased domain is needed.

Choose the free plans, not paid trials. Vercel Hobby is for personal, non-commercial use; review eligibility if the site's purpose changes. Check the providers' usage dashboards periodically. A custom domain purchase is optional and outside this free setup. See [Vercel's plan rules](https://vercel.com/docs/plans/hobby).

### Understand these limits before starting

Render's free API sleeps after 15 idle minutes; waking it can take about a minute. Free instance time is limited to 750 hours per workspace each month, and bandwidth/build limits also apply. SMTP ports 25, 465 and 587 are blocked on free services. See [Render's free-service limits](https://render.com/docs/free).

**What this means here:** the portfolio pages remain available on Vercel, and the form can save messages to Atlas when the API is awake. This free setup does **not** send automatic email notifications. Read saved messages in Atlas as described below; visitors can also use the email link to contact `karnabhosle223@gmail.com`. Adding a free email provider alone does not fix the blocked SMTP ports. An HTTPS email-provider integration would require a code change.

Atlas Free has limited storage (512 MB) and can pause after 30 days without connections. Resume a paused cluster in Atlas if needed. Free clusters do not provide managed backups; periodically export important enquiries. See [Atlas Free limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

## 2. Before you click anything

You need a browser, access to your GitHub account, and an email address for account verification. The initial deployment can be completed through websites; you do not need to install Node, Docker, MongoDB or Git locally.

1. Open [the repository](https://github.com/karnbhosle/K_portfolio).
2. Confirm it contains `package.json`, `package-lock.json`, `apps` and `packages` on branch `main`.
3. Create/sign in to these accounts in separate tabs:
   - [Vercel](https://vercel.com/signup): choose GitHub sign-in and a personal Hobby account.
   - [Render](https://dashboard.render.com/): connect GitHub when asked.
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register): verify your email if requested.
4. When GitHub asks what repositories a provider may access, allow `K_portfolio`. You do not need to give access to unrelated repositories.
5. Create a **private note**, outside GitHub, to record your actual website URL, API URL, database username and database password.

Example addresses below are illustrations, not addresses already created for you. Names may be unavailable. Always copy the actual address shown by the provider.

Rules for settings throughout this guide:

- A URL used here must start with `https://` and have **no trailing slash**, path or spaces.
- Paste environment-variable values without surrounding quote marks.
- Never use `localhost` or `127.0.0.1` as a hosted service's public address.
- Never upload `.env` files, database passwords or database connection strings to GitHub.
- An **environment variable** is simply a named setting entered in a hosting dashboard.

## 3. Put the website on Vercel first

This creates your real website address. The form will be connected later.

1. In Vercel, choose **Add New → Project** and import `karnbhosle/K_portfolio`.
2. If the repository is missing, use the GitHub access/configuration link and grant Vercel access to it, then refresh.
3. Set **Project Name** to `karna-portfolio`, or another available name.
4. Set **Framework Preset** to **Next.js**.
5. Set **Root Directory** to `apps/web`.
6. Enable **Include source files outside of the Root Directory in the Build Step**. The shared package lives outside `apps/web`, so it must be available. If the switch is only available after project creation, enable it in **Settings → Build and Deployment → Root Directory**, then redeploy.
7. Leave the **Install**, **Build**, and **Output Directory** dashboard overrides off. `apps/web/vercel.json` sets the install and build commands. Vercel runs `npm run build` inside `apps/web`, which compiles `@karna/shared` before Next.js. The output is `apps/web/.next`.
8. Select **Node.js 24.x** in the project's Node.js version setting. If you must create the project first, change it in settings and redeploy afterwards. This project requires Node 22.12 or later.
9. Leave the three website environment variables unset for this first deployment. Click **Deploy**.
10. Wait for **Ready**, then open the project's stable production address. Find it under the project's **Domains** section. Copy the address ending in `.vercel.app` into your private note as **WEBSITE URL**. Do not copy a one-off deployment/preview URL.

**Checkpoint:** the portfolio opens and its images, sections and project interactions load. At this stage, the contact section may direct visitors to email instead of submitting. This is expected until step 6.

The build may mention that `metadataBase` is not set yet. Step 6 sets `SITE_URL` and fixes that configuration. The website deliberately falls back to its bundled portfolio content when the API is unavailable.

Monorepo reference: [Vercel's shared-source setting](https://vercel.com/docs/monorepos/monorepo-faq).

## 4. Create the free MongoDB database

1. In Atlas, create a project called `Karna Portfolio` if you do not already have one.
2. Choose **Build a Database / Create a Deployment**.
3. Explicitly select **Free / M0**. Do not choose Flex, Dedicated, a paid tier or a time-limited credit offer.
4. Choose an available provider and nearby region. Prefer a region near the Render region you will use; exact matching is not required.
5. Name the cluster `karna-portfolio`. Wait until it is ready.
6. Under **Database Access / Database & Network Access**, create a **database user** named `portfolio_app`. This is different from your Atlas website login.
7. Generate a strong password and save it in your private note. For easy connection-string handling, use a long random password containing only letters and numbers, preferably 32 characters or more. Do not use an example password from a tutorial.
8. Give this user the **readWrite** role on the database named exactly `karna_portfolio`. In dashboards with a role builder, choose a specific role, select `readWrite`, and enter that database name. Do not grant Atlas administrator access.
9. Under **Network Access / IP Access List**, temporarily add `0.0.0.0/0` with the comment `Temporary hosting setup`. If expiry is offered, select a short setup window. This temporarily allows connection attempts from any IP; credentials are still required. **You will replace this broad entry with Render's outbound ranges in step 5.**
10. On the cluster, click **Connect → Drivers** and choose **Node.js**.
11. Copy the `mongodb+srv://...` connection string into your private note.
12. Replace the username/password placeholders with the database user's actual values. Put `karna_portfolio` after the hostname's `/` and before `?`. Preserve the query string Atlas supplied.

   The structure should look like this, with your actual hostname and password:

   ```text
   mongodb+srv://portfolio_app:YOUR_REAL_PASSWORD@YOUR_REAL_CLUSTER_HOST/karna_portfolio?retryWrites=true&w=majority
   ```

   Do not paste this example unchanged. Remove all placeholder brackets such as `<db_password>`. If your password contains special characters, it must be URL-encoded; generating a long alphanumeric password avoids that extra step.

**Checkpoint:** you have a ready Free cluster, a database user, a temporary network access entry, and a completed private connection string. The database itself may not appear in Browse Collections until the API seeds it.

References: [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/) and [connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

## 5. Put the API on Render

### 5A. Create the correct service

1. In Render choose **New → Web Service**, connect GitHub, and select `karnbhosle/K_portfolio`.
2. Enter these settings:
   - **Name:** `karna-portfolio-api`, or an available alternative.
   - **Branch:** `main`.
   - **Language / Runtime:** Node.
   - **Region:** a region near your Atlas cluster when available.
   - **Root Directory:** leave **blank**. Commands must run from the repository root.
   - **Instance Type:** **Free**.
   - **Auto Deploy:** enabled for `main`.
3. Set **Build Command** to this entire line:

   ```sh
   npm ci --include=dev && npm run build -w @karna/shared && npm run build -w @karna/api && npm run seed -w @karna/api
   ```

4. Set **Start Command** to:

   ```sh
   npm run start -w @karna/api
   ```

5. Set **Health Check Path**, if shown in advanced settings, to:

   ```text
   /api/health/live
   ```

   Do not use `/`: this API does not have a homepage. The liveness route allows the process to start independently of database availability; the separate readiness check below verifies MongoDB.

### 5B. Add the API environment variables

In the Render service's **Environment** settings, add each name and value separately:

```text
NODE_VERSION=24
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=1
NOTIFY_RETRY_INTERVAL_MS=0
```

Then add these two settings using your private note:

- **`MONGODB_URI`**: your completed Atlas connection string.
- **`ALLOWED_ORIGINS`**: your exact stable Vercel WEBSITE URL, for example `https://karna-portfolio.vercel.app`. No trailing slash. Use your actual assigned domain.

Do **not** add a `PORT` override: Render supplies the port. `HOST=0.0.0.0` is required so Render can reach the process.

`TRUST_PROXY=1` is for this direct Render deployment behind its proxy. Do not copy this value blindly if you later add another proxy. It controls how the API identifies visitors for rate limiting; see [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

Leave **all `SMTP_*` variables absent**. Do not copy the SMTP fields from the example environment file. Disabling retry here avoids suggesting that email delivery is configured.

Do not put the database connection string in Vercel or any variable beginning `NEXT_PUBLIC_`; it belongs only to the API.

### 5C. Deploy, verify and restrict database access

1. Click **Create Web Service / Deploy**. If already created, save the settings and redeploy.
2. Open **Logs**. The build should finish seeding with:

   ```text
   [seed] portfolio_updated
   ```

3. Runtime logs should include `listening` and `database_connected`. `email_notifications_disabled` is expected.
4. Copy the service's actual `https://...onrender.com` address into your private note as **API URL**. Copy it from Render rather than constructing it from the service name.
5. Open `YOUR_API_URL/api/health/live` in the browser, replacing `YOUR_API_URL` with that address. Expect:

   ```json
   { "service": "karna-core-api", "status": "ok" }
   ```

6. Open `YOUR_API_URL/api/health`. Expect:

   ```json
   {
     "service": "karna-core-api",
     "status": "ok",
     "database": "connected",
     "email": "not_configured"
   }
   ```

7. In Render, find the service's **Connect / Networking / Outbound** information and copy **all outbound IP addresses or CIDR ranges** listed for the service. Do not use its inbound IP or your laptop's IP.
8. Add those ranges individually to Atlas's project IP Access List. Wait for them to become active, then delete the temporary `0.0.0.0/0` entry. If you cannot find the outbound ranges, resolve that before removing the temporary entry; do not let a temporary expiry surprise you later. See [Render outbound IP documentation](https://render.com/docs/outbound-ip-addresses).
9. Use Render's **Manual Deploy → Deploy latest commit** once more. This confirms the build-time seed can connect under the restricted access list as well as the running API. If seeding is blocked, check the current outbound ranges for both build and runtime in Render and add the required ranges; do not permanently reopen access to all IPs.
10. Recheck `/api/health`. It must still report `database: connected`.
11. Open `YOUR_API_URL/api/portfolio`. Expect JSON containing Karna's profile and projects. Optionally inspect the response headers in browser developer tools: `X-Portfolio-Source: database` confirms seeded database content is being served.

**Checkpoint:** Render is live, the seed completed, the database is connected, and the temporary all-IP access entry has been removed.

The build seeds on every deployment. This is intentional: the latest `packages/shared/src/seed.ts` replaces the stored portfolio document. It does **not** delete contact messages. Edit public content in that source file, not directly in Atlas, because the next deployment overwrites database edits to the portfolio.

Hosting references: [Render Express setup](https://render.com/docs/deploy-node-express-app), [Node version selection](https://render.com/docs/node-version) and [port binding](https://render.com/docs/web-services).

## 6. Connect the website to the API

1. Return to your Vercel **project**, not account settings.
2. Open **Settings → Environment Variables**.
3. Add these three variables for the **Production** environment:
   - **`API_BASE_URL`** = your API URL.
   - **`NEXT_PUBLIC_API_BASE_URL`** = the same API URL.
   - **`SITE_URL`** = your stable WEBSITE URL.
4. Both API values must be just the origin, such as `https://your-actual-api.onrender.com`. Do not append `/api`, `/api/contact` or `/api/portfolio`.
5. `SITE_URL` must be your Vercel website address, not your API address.
6. Confirm **Production Branch** is `main`, **Root Directory** is `apps/web`, shared-source inclusion is enabled, and Node.js is 24.x.
7. Go to **Deployments**, select the latest production deployment, and choose **Redeploy**. Use the current environment values; turn off reuse of the build cache if that option is offered.
8. Wait for **Ready**. Open the stable website URL in a private/incognito window.

**Why redeployment is mandatory:** `NEXT_PUBLIC_API_BASE_URL` is embedded during the build, and also configures the site's browser connection policy. Saving the dashboard setting alone does not update an already-built website.

Preview deployments have separate URLs and are intentionally outside this guide's contact-form configuration. Test on the stable **production** domain. If you later need previews, configure their environment values and explicitly allow their exact origins on the API; do not use a wildcard.

## 7. Test the complete deployed portfolio

1. Open the API readiness page first. If Render is asleep, wait for it to wake, then reload until `database` says `connected`.
2. Open the stable website URL in a private window. Confirm it is publicly accessible without requiring a Vercel login. If it asks for one, review the project's **Deployment Protection** setting for production.
3. Check the intro, skip button, navigation, portrait, projects, games, charts, motion controls and email link. Try the site on a phone too.
4. Open the contact section and send **one** test message using your own email address, a subject such as `Hosting test`, and a message longer than 10 characters.
5. Expect a message saying it was **received and saved**, with email notifications not configured. That is the correct outcome for this setup; do not expect an automatic email.
6. In Atlas, open your cluster → **Browse Collections / Data Explorer** → `karna_portfolio` → `contactmessages`.
7. Refresh and find the message you just submitted. Its `notificationStatus` should be `not_configured`. This verifies persistence, not just the website animation.
8. Open the website's `/robots.txt` and `/sitemap.xml`. The sitemap should contain your real WEBSITE URL after the deployment with `SITE_URL`.
9. After the API has been idle for more than 15 minutes, try its readiness URL again and observe the wake-up. A visitor's first form submission during a cold start may time out. If the form says the result is unconfirmed, wake the API and use the form's retry action without changing the message: it reuses a request key to avoid duplicate saves.

**Checkpoint:** a real submission from the production website appears in Atlas. Do not consider the form working just because the page loads or the API liveness route returns OK.

The API allows five contact attempts per IP per 15 minutes, including invalid attempts. If you get rate limited while testing, wait 15 minutes rather than repeatedly submitting.

## 8. How to read and reply to real enquiries

There is no admin inbox page in this application.

1. Sign in to Atlas and open `karna_portfolio` → `contactmessages`.
2. Sort by newest first. If the interface has a Sort field, enter:

   ```json
   { "createdAt": -1 }
   ```

3. Read the saved `name`, `email`, `subject` and `message`.
4. Reply using your normal email account, to the visitor's saved email address.
5. Check Atlas regularly because this setup sends no notification. Keep account access private; records contain visitor contact information. Export important records before deleting a cluster or changing providers.

## 9. Troubleshooting: match the symptom

### Vercel says it cannot find `@karna/shared` or `dist/index.js`

Check that Vercel is deploying the latest `main` commit, Root Directory is `apps/web`, and outside-root source inclusion is enabled. Clear any old dashboard command overrides and redeploy with **Use existing Build Cache** turned off. The build log should show `@karna/shared` running `tsc -p tsconfig.json` before Next.js starts. That generates `packages/shared/dist`.

### The ignition animation runs silently

Open the site's home address in a private window or choose **Replay intro**. Make sure **Sound** is on and press the reactor. The supplied recording plays in response to the press. Check that the browser tab and device are unmuted. If it is still silent, open `/audio/repulsor.mp3` on the website and verify the recording plays there. If the browser cannot play the file during ignition, the animation continues silently.

### Installation fails or TypeScript/Next.js is missing

Check the Node version is 24.x, the install uses `npm ci --include=dev`, and `package-lock.json` exists. Do not replace pinned dependencies or delete the lockfile just to bypass an error. Read the first actual error in the build log, not only the final `Build failed` line.

### Render reports no open port, a timeout, or cannot find `dist/server.js`

Confirm `HOST=0.0.0.0`, no manually overridden `PORT`, blank Root Directory, and the exact API build/start commands in step 5. Do not use root `npm start`, which also starts the website; Vercel already hosts that part.

### Render build stops at `[seed] failed`

Confirm the Atlas cluster is running, the database user's credentials and `readWrite` permission are correct, the URI names `karna_portfolio`, and Atlas allows Render's current outbound ranges. A build-time seed failure stops this deployment on purpose. After correcting the cause, redeploy the latest commit.

### `/api/health/live` works but `/api/health` says unavailable

The process is running but MongoDB is unreachable. Check the URI and network list as above; also resume a paused Atlas cluster. The API retries the database connection every 15 seconds. Wait briefly and refresh readiness. A functioning `/api/portfolio` by itself does not prove database connectivity, because that endpoint can fall back to bundled content.

### The Render base address shows `Cannot GET /`

That is expected for this API. Test `/api/health/live`, `/api/health` and `/api/portfolio`. Share the Vercel website address with recruiters, not the Render address.

### The form asks visitors to email directly instead of sending

Add `NEXT_PUBLIC_API_BASE_URL` to Vercel's **Production** environment and redeploy. It must be your actual Render origin, not a local address or full endpoint path.

### The form fails with CORS or “Failed to fetch”

First verify API readiness in a separate tab. Then compare the browser's website origin with Render's `ALLOWED_ORIGINS`: they must match exactly, including `https://` and hostname, with no trailing slash. Do not test from a preview URL. Save Render changes and let it restart. If the browser console mentions a Content Security Policy block, check Vercel's public API variable and redeploy Vercel.

### The form result is unconfirmed or the API shows a loading page

Wake the API by opening `/api/health`, wait, then retry through the existing form. Cold starts are a free-plan limitation. Do not treat an unconfirmed result as proof that no message was saved; check Atlas. Do not add artificial keep-alive traffic as a required deployment step.

### Messages save but no email arrives

Expected on this path. Leave SMTP unconfigured and read Atlas. The page's email link opens the visitor's email application; it does not send an automatic notification from the server.

### Content changes appear on GitHub but not on the website

Check both providers deployed the latest `main` commit successfully. Render's build must run the seed. Vercel can cache content for around a minute; wait and refresh. Failed deployments can leave the previous successful version live.

### Live air-quality data fails but the rest works

Check the visitor's network and Open-Meteo availability/limits. The current browser policy already permits the air-quality service; no Atlas setting or email credential controls this chart. A temporary data-feed failure is separate from deployment health.

## 10. Update the portfolio later

For edits from your existing Windows project folder, open PowerShell there:

```powershell
Set-Location 'C:\Users\KarnArjun\OneDrive\Desktop\KarnaPortfolio'
git status
```

Edit the files you intend to change. Public profile, education and project content lives in `packages/shared/src/seed.ts`. Then run:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Only continue if each check succeeds. Review and upload your intended changes:

```powershell
git diff
git add -A
git diff --cached --stat
git commit -m "Update portfolio content"
git push origin main
```

Before committing, check the staged list contains no private files. If you are using a different computer, install Git and Node.js 24 LTS first, clone the repository, and run commands from that clone instead of the example Windows path.

Both providers should deploy automatically. Confirm Render's seed and readiness, Vercel's Ready status, and the final content. If an update fails, use the provider's previous successful deployment/rollback controls or revert the offending commit and push the correction. Remember that rolling back code does not undo database changes; the next successful seed synchronizes the public portfolio content.

If you change a domain later, update all three Vercel URL settings as appropriate, update Render's `ALLOWED_ORIGINS`, and redeploy both services. For multiple allowed website domains, enter exact origins separated by commas, with no wildcard.

## 11. Final completion checklist

- [ ] Vercel is on Hobby, Render service is Free, and Atlas cluster is Free/M0.
- [ ] Website is public at its stable HTTPS production address.
- [ ] Website Node version is 24.x and its shared package builds first.
- [ ] Render builds from the repository root and runs only the API.
- [ ] Render logs show a successful seed and database connection.
- [ ] Atlas permits the required Render outbound ranges; temporary all-IP access is removed.
- [ ] Readiness reports `database: connected` and `email: not_configured`.
- [ ] Vercel's three production URL variables contain real addresses and Vercel was redeployed after setting them.
- [ ] Render allows the exact production website origin.
- [ ] One production contact submission appears in Atlas.
- [ ] You know where to read messages and understand that automatic email is disabled.
- [ ] No secrets were committed, and you have saved credentials privately.
- [ ] You understand cold starts, free quotas and the need to check enquiries and account alerts.

Your shareable portfolio link is the **Vercel WEBSITE URL**. Creating these hosting accounts and entering their settings are still required; this guide does not mean the site has already been deployed.
