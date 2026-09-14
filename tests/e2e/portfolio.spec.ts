import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const sections = [
  ['know-karna', 'Know Karna'],
  ['qualifications', 'Qualifications'],
  ['projects', 'Projects'],
  ['technical-skills', 'Technical Skills'],
  ['activities', 'Co-Curricular Activities'],
  ['contact', 'Contact Me'],
] as const;

const corsHeaders = {
  'access-control-allow-origin': 'http://localhost:3000',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

async function mockContact(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route('**/api/contact', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    expect(route.request().method()).toBe('POST');
    await handler(route);
  });
}

async function fillContact(page: Page) {
  const form = page.locator('#contact form');
  await form.getByLabel('Name', { exact: true }).fill('Portfolio Visitor');
  await form.getByLabel('Email', { exact: true }).fill('visitor@example.org');
  await form.getByLabel('Subject', { exact: true }).fill('An engineering opportunity');
  await form.getByLabel('Message', { exact: true }).fill(
    'Hello Karna, I would like to discuss a software engineering opportunity.',
  );
  return form;
}

test('presents the six required sections in order and real working anchors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const ids = await page.locator('main section[id]').evaluateAll((elements) =>
    elements.map((element) => element.id),
  );
  expect(ids).toEqual(sections.map(([id]) => id));
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Karna Bhosle');
  await expect(page.getByRole('link', { name: 'View Projects', exact: true })).toHaveAttribute(
    'href', '#projects',
  );
  for (const [id] of sections) {
    const link = page.locator(`header nav a[href="#${id}"]:visible`);
    await expect(link).toHaveAttribute('href', `#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await expect(page.locator('header')).toBeInViewport();
  await expect(page.locator('header nav a[href="#contact"]:visible')).toHaveAttribute('aria-current', 'location');
});

test('mobile menu works with the keyboard and closes after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open menu', exact: true });
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.focus();
  await page.keyboard.press('Enter');
  const close = page.getByRole('button', { name: 'Close menu', exact: true });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  await page.locator('header nav a[href="#contact"]:visible').click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await page.keyboard.press('Escape');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await expect(open).toBeFocused();
});

test('reduced motion is respected on first load and the visible toggle persists its choice', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Enable motion', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const animatedDecorations = await page.locator('svg').evaluateAll((elements) =>
    elements.flatMap((element) => element.getAnimations({ subtree: true }))
      .filter((animation) => animation.playState === 'running').length,
  );
  expect(animatedDecorations).toBe(0);
  await page.getByRole('button', { name: 'Enable motion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enable motion', exact: true })).toBeVisible();
});

test('decorative reactor loops pause after scrolling offscreen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
  const runningLoops = () => page.locator('.reactor-frame').evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) =>
      animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity,
    ).length,
  );
  await expect.poll(runningLoops).toBeGreaterThan(0);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect.poll(runningLoops).toBe(0);
});

test('project technical details expand with the keyboard', async ({ page }) => {
  await page.goto('/#projects');
  const details = page.locator('#projects details').first();
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('PM2.5');
  await page.keyboard.press('Enter');
  await expect(details).not.toHaveAttribute('open', '');
});

test('core content and direct contact links remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AeroSense', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CorpusAI', exact: true })).toBeVisible();
  for (const [id] of sections) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator('#contact a[href="mailto:karnabhosle223@gmail.com"]').first()).toBeVisible();
  await expect(page.locator('#contact a[href="tel:+919076070482"]')).toBeVisible();
  const form = await fillContact(page);
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
  await form.getByLabel('Name', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(/software engineering opportunity/);
  await context.close();
});

for (const width of [360, 768, 1440]) {
  test(`has no horizontal overflow and passes accessibility checks at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    for (const [id] of sections) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      );
      expect(overflow, `Horizontal overflow near #${id}`).toBeLessThanOrEqual(1);
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/portfolio-${width}-hero.png` });
    await page.screenshot({ path: `test-results/portfolio-${width}.png`, fullPage: true });
  });
}

test('content reflows at a 200 percent desktop zoom equivalent', async ({ browser }) => {
  // A 1440px display at 200% zoom exposes 720 CSS pixels. This checks that
  // reflow without relying on browser-chrome shortcuts in headless Chromium.
  const context = await browser.newContext({
    viewport: { width: 720, height: 500 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  for (const [id] of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
  await expect(page.locator('#contact').getByLabel('Message', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/portfolio-zoom-200-equivalent.png', fullPage: true });
  await context.close();
});

test('keeps the visitor message on persistence failure and blocks duplicate pending submissions', async ({ page }) => {
  let requests = 0;
  let releaseRequest: (() => void) | undefined;
  const pendingRequest = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await mockContact(page, async (route) => {
    requests += 1;
    await pendingRequest;
    await route.fulfill({
      status: 503,
      headers: corsHeaders,
      json: { received: false, message: 'Your message could not be saved. Please email Karna directly.' },
    });
  });
  await page.goto('/#contact');
  const form = await fillContact(page);
  await form.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await expect(form.getByRole('button', { name: /Sending|Send message/i })).toBeDisabled();
  releaseRequest?.();
  await expect(form.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toContainText(/could not be saved|unable|failed|try again/i);
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(/software engineering opportunity/);
  await expect(page.locator('#contact a[href="mailto:karnabhosle223@gmail.com"]').first()).toBeVisible();
  expect(requests).toBe(1);
});

test('invalid visitor input is caught before an API request', async ({ page }) => {
  let requests = 0;
  await mockContact(page, (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto('/#contact');
  const form = await fillContact(page);
  await form.getByLabel('Email', { exact: true }).fill('not-an-email');
  await form.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(form.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(/software engineering opportunity/);
  expect(requests).toBe(0);
});

test('an HTML gateway failure retains the message and offers a readable direct-email fallback', async ({ page }) => {
  await mockContact(page, (route) => route.fulfill({
    status: 502,
    headers: corsHeaders,
    contentType: 'text/html',
    body: '<!doctype html><html><body>Bad gateway</body></html>',
  }));
  await page.goto('/#contact');
  const form = await fillContact(page);
  await form.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(/could not be confirmed/i);
  await expect(page.getByRole('status')).not.toContainText(/SyntaxError|JSON|DOCTYPE/i);
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(/software engineering opportunity/);
  await expect(form.getByRole('link', { name: /Email Karna directly/ })).toBeVisible();
  await expect(form.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled();
});

for (const notification of ['accepted', 'failed', 'not_configured'] as const) {
  test(`reports saved-message status honestly when SMTP is ${notification}`, async ({ page }) => {
    await mockContact(page, (route) => route.fulfill({
      status: 201,
      headers: corsHeaders,
      json: {
        received: true,
        notification,
        message: notification === 'accepted'
          ? 'Your message was saved. An email notification was accepted by the mail server.'
          : 'Your message was saved, but email notification is unavailable. Please email Karna directly for urgent enquiries.',
      },
    }));
    await page.goto('/#contact');
    const form = await fillContact(page);
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(/saved|received/i);
    await expect(page.getByRole('status')).not.toContainText(/delivered to.*inbox/i);
    if (notification !== 'accepted') {
      await expect(page.getByRole('status')).toContainText(/direct|urgent/i);
    }
  });
}

test('server validation errors are exposed next to fields without losing the entered message', async ({ page }) => {
  await mockContact(page, (route) => route.fulfill({
    status: 400,
    headers: corsHeaders,
    json: {
      received: false,
      message: 'Please correct the highlighted fields.',
      errors: { email: ['Please enter a valid email address.'] },
    },
  }));
  await page.goto('/#contact');
  const form = await fillContact(page);
  await form.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(form.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByText('Please enter a valid email address.', { exact: true })).toBeVisible();
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(/software engineering opportunity/);
});
