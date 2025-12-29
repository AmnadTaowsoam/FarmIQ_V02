import { test, expect } from '@playwright/test';

const tenantId = process.env.SMOKE_TENANT_ID || '';
const farmId = process.env.SMOKE_FARM_ID || '';
const barnId = process.env.SMOKE_BARN_ID || '';

const setActiveContext = async (page) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);

  const context = {
    tenantId: tenantId || null,
    farmId: farmId || null,
    barnId: barnId || null,
    batchId: null,
    species: null,
    timeRange: {
      start: start.toISOString(),
      end: now.toISOString(),
      preset: '7d',
    },
  };

  await page.addInitScript((ctx) => {
    window.localStorage.setItem('farmiq_active_context', JSON.stringify(ctx));
  }, context);
};

const routeScreens = [
  { path: '/farms', heading: 'Farms' },
  { path: '/barns', heading: 'Barns' },
  { path: '/devices', heading: 'Device Registry' },
  { path: '/sensors', heading: 'Sensor Catalog' },
  { path: '/feeding/kpi', heading: 'Feeding KPIs' },
  { path: '/barns/records', heading: 'Barn Records' },
];

test.describe('dashboard-web smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setActiveContext(page);
  });

  test('key routes render without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    if (!tenantId) {
      test.skip(true, 'SMOKE_TENANT_ID is required for route smoke checks.');
    }

    for (const route of routeScreens) {
      if (route.path === '/barns/records' && (!farmId || !barnId)) {
        continue;
      }
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();

      const hasTable = await page.locator('table').first().isVisible().catch(() => false);
      const hasEmpty = await page.getByText(/no .*found|no data available|no .*available/i).first().isVisible().catch(() => false);
      const hasApiError = await page.getByText(/endpoint not found|api error/i).first().isVisible().catch(() => false);
      const hasContextGate = await page.getByText(/select a farm|select a barn|select a tenant/i).first().isVisible().catch(() => false);

      expect(hasTable || hasEmpty || hasApiError || hasContextGate).toBeTruthy();

      const safeName = route.path.replace(/\//g, '_').replace(/_{2,}/g, '_').replace(/^_/, '');
      await page.screenshot({
        path: `apps/dashboard-web/evidence/smoke/screens/${safeName}.png`,
        fullPage: true,
      });
    }

    expect(errors).toEqual([]);
  });
});
