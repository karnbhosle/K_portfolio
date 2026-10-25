import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const sections = [
  ['know-karna', 'Know Karna'],
  ['qualifications', 'Qualifications'],
  ['projects', 'Projects'],
  ['technical-skills', 'Tech matrix'],
  ['activities', 'Leadership & awards'],
  ['contact', 'Contact'],
] as const;

const corsHeaders = {
  'access-control-allow-origin': 'http://localhost:3000',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Idempotency-Key',
  'access-control-expose-headers': 'Retry-After, X-Request-Id',
};

/** Most tests start after the ignition intro, as a returning visitor in the same session would. */
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try { window.sessionStorage.setItem('karna:intro', 'done'); } catch { /* storage blocked */ }
  });
}

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
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill('Portfolio Visitor');
  await form.getByRole('textbox', { name: 'Email', exact: true }).fill('visitor@example.org');
  await form.getByRole('textbox', { name: 'Subject', exact: true }).fill('An engineering opportunity');
  await form.getByRole('textbox', { name: 'Message', exact: true }).fill(
    'Hello Karna, I would like to discuss a software engineering opportunity.',
  );
  return form;
}

const contactStatus = (page: Page) => page.locator('#contact').getByRole('status');

test.describe('ignition intro', () => {
  test('gates the first visit, ignites from the reactor, and stays away for the session', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const intro = page.getByRole('dialog', { name: 'Press the core to enter' });
    await expect(intro).toBeVisible();
    const reactor = intro.getByRole('button', { name: /Ignite the arc reactor/ });
    await expect(reactor).toBeFocused();
    await expect(page.locator('#site')).toHaveJSProperty('inert', true);

    await reactor.press('Enter');
    await expect(intro.getByRole('progressbar', { name: 'Ignition' })).not.toHaveAttribute('aria-valuenow', '0');
    await expect(intro).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#site')).toHaveJSProperty('inert', false);
    await expect(page.getByRole('heading', { level: 1, name: 'Karna Bhosle' })).toBeFocused();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(intro).toBeHidden();
  });

  test('can be skipped with the button or Escape, and replayed later', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const intro = page.getByRole('dialog', { name: 'Press the core to enter' });
    await intro.getByRole('button', { name: 'Skip intro' }).click();
    await expect(intro).toBeHidden();

    await page.getByRole('button', { name: 'Replay intro' }).click();
    await expect(intro).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(intro).toBeHidden();
  });

  test('does not stand between a deep link and its section', async ({ page }) => {
    await page.goto('/#projects');
    await expect(page.getByRole('dialog', { name: 'Press the core to enter' })).toBeHidden();
    await expect(page.locator('#projects')).toBeInViewport();
  });

  test('remembers the sound preference', async ({ page }) => {
    await page.goto('/');
    const sound = page.getByRole('button', { name: 'Sound' });
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('navigation and structure', () => {
  test.beforeEach(async ({ page }) => { await skipIntro(page); });

  test('presents the six sections in order with working anchors and live navigation state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const ids = await page.locator('main > section[id]').evaluateAll((elements) => elements.map((element) => element.id));
    expect(ids).toEqual(sections.map(([id]) => id));
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Karna Bhosle');
    await expect(page.getByRole('link', { name: 'View projects', exact: true })).toHaveAttribute('href', '#projects');

    const rail = page.getByRole('navigation', { name: 'Sections' }).filter({ visible: true });
    for (const [id, label] of sections) {
      const link = rail.getByRole('link', { name: new RegExp(label) });
      await expect(link).toHaveAttribute('href', `#${id}`);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect(rail.getByRole('link', { name: /Contact/ })).toHaveAttribute('aria-current', 'location');
  });

  test('mobile menu works with the keyboard and closes after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const open = page.getByRole('button', { name: 'Open menu', exact: true });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await open.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('dialog', { name: 'Site menu' });
    await expect(menu).toBeVisible();
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await menu.getByRole('link', { name: /Contact$/ }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(menu).toBeHidden();
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#contact')).toBeInViewport();

    await open.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('project implementation notes expand with the keyboard', async ({ page }) => {
    await page.goto('/#projects');
    const details = page.locator('#project-aerosense details');
    await details.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await expect(details).toContainText('PM2.5');
    await page.keyboard.press('Enter');
    await expect(details).not.toHaveAttribute('open', '');
  });

  test('the tech matrix links skills to the projects that use them', async ({ page }) => {
    await page.goto('/#technical-skills');
    const matrix = page.locator('#technical-skills');
    await expect(matrix.getByRole('status')).toHaveText('30 skills across 7 areas.');
    await matrix.getByRole('button', { name: 'CorpusAI' }).click();
    await expect(matrix.getByRole('button', { name: 'CorpusAI' })).toHaveAttribute('aria-pressed', 'true');
    await expect(matrix.getByRole('status')).toHaveText(/^\d+ of 30 skills appear in CorpusAI\.$/);
    await expect(matrix.getByRole('listitem').filter({ hasText: 'XGBoost' })).toContainText('Used in CorpusAI');
  });

  test('the AQI band scale explains the selected band', async ({ page }) => {
    await page.goto('/#project-aerosense');
    const bands = page.getByRole('group', { name: 'CPCB AQI bands' });
    await bands.getByRole('button', { name: /Severe/ }).click();
    await expect(bands.getByRole('button', { name: /Severe/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#project-aerosense')).toContainText('Severe, AQI 401–500.');
  });

  test('unknown paths get a branded 404 with a way back', async ({ page }) => {
    const response = await page.goto('/not-a-real-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page doesn’t exist.');
    await page.getByRole('link', { name: 'Go to the portfolio' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});

test.describe('motion', () => {
  test('reduced motion is respected on first load and the visible toggle persists its choice', async ({ page }) => {
    await skipIntro(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const enable = page.getByRole('button', { name: 'Enable motion', exact: true }).filter({ visible: true });
    await expect(enable).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    const running = await page.evaluate(() =>
      document.getAnimations().filter((animation) => animation.playState === 'running').length,
    );
    expect(running).toBe(0);
    await enable.click();
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause motion', exact: true }).filter({ visible: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Enable motion', exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('the ambient reactor turns only while motion is on', async ({ page }) => {
    await skipIntro(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const loops = () => page.locator('.ambient-reactor').evaluate((element) =>
      element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
    );
    await expect.poll(loops).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause motion', exact: true }).filter({ visible: true }).click();
    await expect.poll(loops).toBe(0);
  });
});

test('core content and direct contact links remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.intro')).toBeHidden();
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
  await form.getByRole('textbox', { name: 'Name', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
  await context.close();
});

/**
 * The body clips horizontal overflow, so page scroll width alone would hide a clipped element.
 * This lists visible content that leaves the viewport; the decorative reactor is meant to bleed.
 */
function elementsPastViewport(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll('main *, footer *, header *'))
      .filter((element) => !element.closest('[aria-hidden="true"], .sr-only, .ambient-reactor'))
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.right > width + 1 || box.left < -1);
      })
      .map((element) => `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 40)}"`);
  });
}

for (const width of [320, 360, 768, 1440]) {
  test(`has no horizontal overflow and passes accessibility checks at ${width}px`, async ({ page }) => {
    await skipIntro(page);
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
    expect(await elementsPastViewport(page)).toEqual([]);
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/portfolio-${width}-hero.png` });
    await page.screenshot({ path: `test-results/portfolio-${width}.png`, fullPage: true });
  });
}

test('the intro passes accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Press the core to enter' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('content reflows at a 200 percent desktop zoom equivalent', async ({ browser }) => {
  // A 1440px display at 200% zoom exposes 720 CSS pixels. This checks that
  // reflow without relying on browser-chrome shortcuts in headless Chromium.
  const context = await browser.newContext({
    viewport: { width: 720, height: 500 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await skipIntro(page);
  await page.goto('http://localhost:3000');
  for (const [id] of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )).toBeLessThanOrEqual(1);
  }
  expect(await elementsPastViewport(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
  await expect(page.locator('#contact').getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/portfolio-zoom-200-equivalent.png', fullPage: true });
  await context.close();
});

test.describe('contact form', () => {
  test.beforeEach(async ({ page }) => { await skipIntro(page); });

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
    await expect(contactStatus(page)).toContainText(/could not be saved/i);
    await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
    await expect(contactStatus(page).getByRole('link', { name: 'Email Karna directly' })).toBeVisible();
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
    await form.getByRole('textbox', { name: 'Email', exact: true }).fill('not-an-email');
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    const email = form.getByRole('textbox', { name: 'Email', exact: true });
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();
    await expect(email).toHaveAccessibleDescription(/valid email|name@example.com/i);
    await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
    expect(requests).toBe(0);
  });

  test('an HTML gateway failure keeps the message, offers email, and retries without duplicating', async ({ page }) => {
    const keys: string[] = [];
    let calls = 0;
    await mockContact(page, async (route) => {
      calls += 1;
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      if (calls === 1) {
        await route.fulfill({ status: 502, headers: corsHeaders, contentType: 'text/html', body: '<!doctype html><html><body>Bad gateway</body></html>' });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        json: { received: true, notification: 'accepted', replayed: true, message: 'Your message was received and saved. An email notification was accepted by the mail service; inbox delivery is not confirmed.' },
      });
    });
    await page.goto('/#contact');
    const form = await fillContact(page);
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(contactStatus(page)).toContainText(/could not be confirmed/i);
    await expect(contactStatus(page)).not.toContainText(/SyntaxError|JSON|DOCTYPE/i);
    await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
    await expect(form.getByRole('link', { name: /Email Karna directly/ })).toBeVisible();

    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(contactStatus(page)).toContainText(/received and saved/i);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(keys[1]).toBe(keys[0]);
  });

  test('a changed message gets a new idempotency key', async ({ page }) => {
    const keys: string[] = [];
    await mockContact(page, async (route) => {
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      await route.fulfill({ status: 503, headers: corsHeaders, json: { received: false, message: 'Your message could not be saved.' } });
    });
    await page.goto('/#contact');
    const form = await fillContact(page);
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(contactStatus(page)).toContainText(/could not be saved/i);
    await form.getByRole('textbox', { name: 'Message', exact: true }).fill('A completely different enquiry about a backend role.');
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect.poll(() => keys.length).toBe(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  test('a rate-limited submission says when to try again', async ({ page }) => {
    await mockContact(page, (route) => route.fulfill({
      status: 429,
      headers: { ...corsHeaders, 'retry-after': '600' },
      json: { received: false, message: 'Too many enquiries from this network. Please try again later or email Karna directly.' },
    }));
    await page.goto('/#contact');
    const form = await fillContact(page);
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(contactStatus(page)).toContainText('try again in about 10 minutes');
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
      await expect(contactStatus(page)).toContainText(/saved|received/i);
      await expect(contactStatus(page)).not.toContainText(/delivered to.*inbox/i);
      await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
      if (notification !== 'accepted') {
        await expect(contactStatus(page)).toContainText(/direct|urgent/i);
      }
    });
  }

  test('server validation errors are exposed next to fields without losing the entered message', async ({ page }) => {
    await mockContact(page, (route) => route.fulfill({
      status: 400,
      headers: corsHeaders,
      json: {
        received: false,
        message: 'Please check the highlighted fields and try again.',
        errors: { email: ['Enter an email address like name@example.com.'] },
      },
    }));
    await page.goto('/#contact');
    const form = await fillContact(page);
    await form.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(form.getByRole('textbox', { name: 'Email', exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Enter an email address like name@example.com.', { exact: true })).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
  });

  test('an unsent draft survives a reload', async ({ page }) => {
    await page.goto('/#contact');
    await fillContact(page);
    await page.waitForTimeout(500);
    await page.reload();
    const form = page.locator('#contact form');
    await expect(form.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(/software engineering opportunity/);
    await expect(form.getByText(/^72 \/ 5,000$/)).toBeVisible();
  });
});
