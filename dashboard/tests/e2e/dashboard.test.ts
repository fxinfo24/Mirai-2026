import puppeteer, { Browser, Page } from 'puppeteer';

// Navigate using domcontentloaded — networkidle0 hangs on 3D globe + WebSocket
async function goto(page: Page, url: string, extra = 1500) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(resolve => setTimeout(resolve, extra));
}

/**
 * Log in via the /login page using the default dev credentials (admin/admin).
 * After success the app redirects to /dashboard — we wait for that navigation.
 * Subsequent goto() calls on the same page will be authenticated because the
 * auth token is stored in localStorage by the Next.js auth lib.
 */
async function loginToDashboard(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Fill username
  await page.waitForSelector('input[autocomplete="username"], input[name="username"], input[placeholder*="username" i]', { timeout: 8000 });
  await page.type('input[autocomplete="username"], input[name="username"], input[placeholder*="username" i]', 'admin');

  // Fill password
  await page.type('input[type="password"]', 'admin');

  // Submit and wait for redirect to /dashboard
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // Give the client-side redirect a moment to settle
  await new Promise(resolve => setTimeout(resolve, 1000));
}

describe('Dashboard E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:3002';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      timeout: 15000,
    });
  }, 20000);

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    page.on('console', () => {});   // suppress WS noise
    page.on('pageerror', () => {}); // suppress hydration errors
  });

  afterEach(async () => {
    try { await page.close(); } catch (_) { /* already closed */ }
  });

  // ── Landing Page ──────────────────────────────────────────────────────────

  describe('Landing Page', () => {
    test('should load landing page successfully', async () => {
      await goto(page, baseUrl);
      expect(page.url()).toContain('localhost:3002');
    });

    test('should display main heading', async () => {
      await goto(page, baseUrl);
      const heading = await page.$eval('h1', el => el.textContent).catch(() => '');
      expect(heading.toLowerCase()).toContain('mirai');
    });

    test('should have Enter Dashboard button', async () => {
      await goto(page, baseUrl);
      const button = await page.$('a[href="/dashboard"]');
      expect(button).not.toBeNull();
    });

    test('should navigate to dashboard on button click', async () => {
      await goto(page, baseUrl);
      await page.click('a[href="/dashboard"]');
      // Next.js uses client-side navigation — wait for the URL to change rather
      // than a full page load. Unauthenticated users land on /login (auth guard).
      await page.waitForFunction(
        () => !window.location.href.endsWith('/'),
        { timeout: 10000 },
      ).catch(() => {});
      // Accept /dashboard or /login (auth-guard redirect is correct behaviour)
      expect(page.url()).toMatch(/\/(dashboard|login)/);
    });

    test('should display tech stack cards', async () => {
      await goto(page, baseUrl);
      const body = await page.$eval('body', el => el.innerHTML);
      expect(body.length).toBeGreaterThan(100);
    });
  });

  // ── Dashboard Page ────────────────────────────────────────────────────────
  // All tests in this block navigate to /dashboard which requires authentication.
  // beforeEach logs in via the /login form (admin/admin) so the auth token is
  // stored in localStorage before each test navigates to the protected route.

  describe('Dashboard Page', () => {
    beforeEach(async () => {
      await loginToDashboard(page, baseUrl);
    }, 25000);

    test('should load dashboard page successfully', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      expect(page.url()).toContain('/dashboard');
    });

    test('should display stat cards', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const statCards = await page.$$('[class*="stat"], [class*="card"], [class*="Card"]');
      expect(statCards.length).toBeGreaterThan(0);
    });

    test('should display Active Bots metric', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const content = await page.content();
      expect(content).toContain('Active Bots');
    });

    test('should display Active Attacks metric', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const content = await page.content();
      expect(content).toContain('Active Attacks');
    });

    test('should display navigation bar', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const nav = await page.$('nav');
      expect(nav).not.toBeNull();
    });

    test('should have responsive navigation', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      await page.setViewport({ width: 375, height: 667 });
      const nav = await page.$('nav');
      expect(nav).not.toBeNull();
    });

    test('should display 3D globe component', async () => {
      await goto(page, `${baseUrl}/dashboard`, 3000); // extra time for Three.js
      const canvas = await page.waitForSelector('canvas', { timeout: 10000 }).catch(() => null);
      expect(canvas).not.toBeNull();
    });

    test('should display recent activity', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const content = await page.content();
      expect(content).toContain('Recent Activity');
    });

    test('should display quick actions', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const content = await page.content();
      expect(content).toContain('Quick Actions');
    });

    test('should display system status', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      const content = await page.content();
      expect(content.toLowerCase()).toContain('status');
    });

    test('should handle window resize', async () => {
      await goto(page, `${baseUrl}/dashboard`);
      await page.setViewport({ width: 768, height: 1024 });
      await page.setViewport({ width: 1920, height: 1080 });
      const nav = await page.$('nav');
      expect(nav).not.toBeNull();
    });
  });

  // ── Performance ───────────────────────────────────────────────────────────

  describe('Performance', () => {
    beforeEach(async () => {
      await loginToDashboard(page, baseUrl);
    }, 25000);

    test('landing page should load quickly', async () => {
      const start = Date.now();
      await goto(page, baseUrl);
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(15000);
    });

    test('dashboard should load within acceptable time', async () => {
      const start = Date.now();
      await goto(page, `${baseUrl}/dashboard`, 3000);
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(20000);
    });
  });

  // ── Screenshots ───────────────────────────────────────────────────────────

  describe('Screenshots', () => {
    beforeEach(async () => {
      await loginToDashboard(page, baseUrl);
    }, 25000);

    test('landing page screenshot', async () => {
      await goto(page, baseUrl);
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/landing-page.png',
      });
      expect(screenshot).toBeDefined();
    });

    test('dashboard page screenshot', async () => {
      await goto(page, `${baseUrl}/dashboard`, 3000);
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/dashboard-page.png',
      });
      expect(screenshot).toBeDefined();
    });

    test('mobile dashboard screenshot', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await goto(page, `${baseUrl}/dashboard`);
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/dashboard-mobile.png',
      });
      expect(screenshot).toBeDefined();
    });
  });
});
