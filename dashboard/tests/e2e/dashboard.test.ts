import puppeteer, { Browser, Page } from 'puppeteer';

describe('Dashboard E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:3002';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Landing Page', () => {
    test('should load landing page successfully', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      const title = await page.title();
      expect(title).toBe('Mirai 2026 Dashboard');
    });

    test('should display main heading', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      const heading = await page.$eval('h1', el => el.textContent);
      expect(heading).toContain('Mirai 2026');
    });

    test('should have Enter Dashboard button', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      const button = await page.$('a[href="/dashboard"]');
      expect(button).not.toBeNull();
      
      const buttonText = await page.$eval('a[href="/dashboard"]', el => el.textContent);
      expect(buttonText).toContain('Enter Dashboard');
    });

    test('should navigate to dashboard on button click', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      await page.click('a[href="/dashboard"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      const url = page.url();
      expect(url).toBe(`${baseUrl}/dashboard`);
    });

    test('should display tech stack cards', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      const techStack = await page.$$eval('.glass-card', cards => 
        cards.map(card => card.textContent)
      );
      
      expect(techStack.some(text => text?.includes('Next.js 14'))).toBe(true);
      expect(techStack.some(text => text?.includes('Three.js'))).toBe(true);
      expect(techStack.some(text => text?.includes('TypeScript'))).toBe(true);
      expect(techStack.some(text => text?.includes('Tailwind CSS'))).toBe(true);
    });
  });

  describe('Dashboard Page', () => {
    beforeEach(async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
    });

    test('should load dashboard page successfully', async () => {
      const heading = await page.$eval('h1', el => el.textContent);
      expect(heading).toContain('Command & Control Dashboard');
    });

    test('should display stat cards', async () => {
      await page.waitForSelector('[class*="StatCard"]', { timeout: 5000 });
      
      const stats = await page.$$('[class*="StatCard"]');
      expect(stats.length).toBeGreaterThanOrEqual(4);
    });

    test('should display Active Bots metric', async () => {
      const content = await page.content();
      expect(content).toContain('Active Bots');
      expect(content).toContain('1,234');
    });

    test('should display Active Attacks metric', async () => {
      const content = await page.content();
      expect(content).toContain('Active Attacks');
      expect(content).toContain('42');
    });

    test('should display navigation bar', async () => {
      const nav = await page.$('nav');
      expect(nav).not.toBeNull();
      
      const navLinks = await page.$$eval('nav a', links => 
        links.map(link => link.textContent)
      );
      
      expect(navLinks.some(text => text?.includes('Dashboard'))).toBe(true);
      expect(navLinks.some(text => text?.includes('Bots'))).toBe(true);
      expect(navLinks.some(text => text?.includes('Attacks'))).toBe(true);
    });

    test('should have responsive navigation', async () => {
      // Test mobile view
      await page.setViewport({ width: 375, height: 667 });
      
      const hamburger = await page.$('button[class*="md:hidden"]');
      expect(hamburger).not.toBeNull();
    });

    test('should display 3D globe component', async () => {
      // Wait for canvas element (Three.js renders to canvas)
      await page.waitForSelector('canvas', { timeout: 10000 });
      
      const canvas = await page.$('canvas');
      expect(canvas).not.toBeNull();
    });

    test('should display recent activity', async () => {
      const content = await page.content();
      expect(content).toContain('Recent Activity');
    });

    test('should display quick actions', async () => {
      const content = await page.content();
      expect(content).toContain('Quick Actions');
      expect(content).toContain('Launch Attack');
      expect(content).toContain('Scan Network');
    });

    test('should display system status', async () => {
      const content = await page.content();
      expect(content).toContain('System Status');
      expect(content).toContain('C&C Server');
      expect(content).toContain('operational');
    });

    test('should handle window resize', async () => {
      // Desktop
      await page.setViewport({ width: 1920, height: 1080 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Tablet
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mobile
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Page should still be functional
      const heading = await page.$eval('h1', el => el.textContent);
      expect(heading).toContain('Command & Control Dashboard');
    });
  });

  describe('Performance', () => {
    test('landing page should load quickly', async () => {
      const startTime = Date.now();
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      // Should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('dashboard should load quickly', async () => {
      const startTime = Date.now();
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      // Should load in under 10 seconds (includes 3D rendering)
      expect(loadTime).toBeLessThan(10000);
    });

    test('should not have console errors', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      
      // Filter out known acceptable errors (like WebGL warnings)
      const criticalErrors = consoleErrors.filter(
        err => !err.includes('WebGL') && !err.includes('Three')
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      
      const h1Count = await page.$$eval('h1', headings => headings.length);
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('buttons should be keyboard accessible', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      // Tab to first button
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      
      // Should focus on an interactive element
      expect(['BUTTON', 'A']).toContain(activeElement);
    });
  });

  describe('Visual Regression', () => {
    test('landing page screenshot', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/landing-page.png',
      });
      
      expect(screenshot).toBeDefined();
    });

    test('dashboard screenshot', async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      
      // Wait for 3D globe to render
      await page.waitForSelector('canvas', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/dashboard-page.png',
      });
      
      expect(screenshot).toBeDefined();
    });

    test('mobile dashboard screenshot', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      
      const screenshot = await page.screenshot({
        fullPage: true,
        path: 'tests/e2e/screenshots/dashboard-mobile.png',
      });
      
      expect(screenshot).toBeDefined();
    });
  });
});
