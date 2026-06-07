import { chromium } from '@playwright/test';

const EMAIL = 'andrej.bosnjak1111@gmail.com';
const PASS  = process.env.LUMEN_PASS ?? '';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

if (PASS) {
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 8000 }).catch(() => {});
}

await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/s_analytics_top.png', clip: { x: 0, y: 0, width: 1400, height: 900 } });

// Scroll to behavioral insights area
await page.evaluate(() => window.scrollTo(0, 2000));
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/s_analytics_mid.png', clip: { x: 0, y: 0, width: 1400, height: 900 } });

await page.evaluate(() => window.scrollTo(0, 4000));
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/s_analytics_bottom.png', clip: { x: 0, y: 0, width: 1400, height: 900 } });

console.log('done');
await browser.close();
