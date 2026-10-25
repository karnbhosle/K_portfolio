/**
 * Screenshots the running portfolio for visual review: the intro, each section, and the full page.
 * Usage (with the site running):
 *   node tests/helpers/capture.mjs [baseUrl] [widths]
 *   node tests/helpers/capture.mjs http://localhost:3000 360,768,1440
 * Images go to the ignored test-results/capture/ folder.
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const target = process.argv[2] || 'http://localhost:3000';
const widths = (process.argv[3] || '360,768,1440').split(',').map(Number);
if (widths.some((width) => !Number.isInteger(width) || width < 320 || width > 2560)) {
  throw new Error('Viewport widths must be integers between 320 and 2560.');
}
const sections = ['know-karna', 'qualifications', 'projects', 'technical-skills', 'activities', 'contact'];
const directory = resolve('test-results', 'capture');
await mkdir(directory, { recursive: true });

const browser = await chromium.launch();
try {
  for (const width of widths) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.goto(target, { waitUntil: 'networkidle' });
    await page.screenshot({ path: resolve(directory, `${width}-intro.png`) });
    await page.getByRole('button', { name: 'Skip intro' }).click();
    // Scroll through once so every scroll reveal has fired before capturing.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let top = 0; top < height; top += 500) {
      await page.evaluate((y) => window.scrollTo(0, y), top);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(700);
    for (const id of sections) {
      await page.locator(`#${id}`).screenshot({ path: resolve(directory, `${width}-${id}.png`) });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(directory, `${width}-full.png`), fullPage: true });
    await context.close();
    console.log(`captured ${width}px`);
  }
} finally {
  await browser.close();
}
