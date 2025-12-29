import { test, expect } from '@playwright/test';

const tenantId = process.env.SMOKE_TENANT_ID || '';

const seedContext = async (page) => {
  if (!tenantId) return;
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);

  const context = {
    tenantId,
    farmId: null,
    barnId: null,
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

test.describe('Reports module', () => {
  test('create report job flow', async ({ page }) => {
    if (!tenantId) {
      test.skip(true, 'SMOKE_TENANT_ID is required for reports e2e.');
    }

    await seedContext(page);
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    await page.getByRole('button', { name: /create export/i }).click();
    await expect(page).toHaveURL(/\/reports\/new/);

    await page.getByLabel('Start Date').fill(new Date().toISOString().slice(0, 10));
    await page.getByLabel('End Date').fill(new Date().toISOString().slice(0, 10));
    await page.getByRole('button', { name: /create export/i }).click();

    await expect(page.getByRole('heading', { name: /report job detail/i })).toBeVisible();
  });
});
