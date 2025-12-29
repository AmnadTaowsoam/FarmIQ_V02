import { test, expect } from '@playwright/test';

const defaultTenantId = process.env.VITE_DEFAULT_TENANT_ID || process.env.SMOKE_TENANT_ID || '';

test.describe('tenant selection', () => {
  test('select tenant or use dev override', async ({ page }) => {
    await page.goto('/select-tenant', { waitUntil: 'domcontentloaded' });

    const tenantCards = page.getByRole('button', { name: /enter workspace/i });
    const overrideInput = page.getByLabel('Developer tenant ID');
    const overrideButton = page.getByRole('button', { name: /use this tenantid/i });

    if (await tenantCards.first().isVisible().catch(() => false)) {
      await tenantCards.first().click();
      await expect(page).toHaveURL(/select-farm|overview/);
    } else if (await overrideInput.isVisible().catch(() => false)) {
      if (!defaultTenantId) {
        test.skip(true, 'VITE_DEFAULT_TENANT_ID or SMOKE_TENANT_ID is required for dev override.');
      }
      await overrideInput.fill(defaultTenantId);
      await overrideButton.click();
      await expect(page).toHaveURL(/select-farm|overview/);
    } else {
      test.skip(true, 'Tenant cards or dev override not available.');
    }

    await page.screenshot({
      path: 'apps/dashboard-web/evidence/smoke/screens/select-tenant.png',
      fullPage: true,
    });
  });
});
