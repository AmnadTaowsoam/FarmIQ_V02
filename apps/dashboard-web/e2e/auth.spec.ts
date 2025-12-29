import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('happy path: login → select context → overview renders', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form (mock credentials for now)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to context selection or overview
    await expect(page).toHaveURL(/\/select-context|\/overview/);

    // If context selection, select tenant
    if (page.url().includes('/select-context')) {
      await page.selectOption('select', { label: /tenant/i });
      await page.click('button:has-text("Continue")');
    }

    // Should be on overview page
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.locator('h1, h2, h3')).toContainText(/overview|dashboard/i);
  });

  test('security: cross-tenant navigation should error', async ({ page }) => {
    // This test verifies that attempting to access data from another tenant
    // should result in an error or redirect
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for context selection
    await page.waitForURL(/\/select-context|\/overview/);

    // Try to access a different tenant's data via URL manipulation
    await page.goto('/barns/some-barn-id?tenant_id=different-tenant-id');

    // Should show error or redirect
    await expect(
      page.locator('text=/error|forbidden|access denied/i')
    ).toBeVisible({ timeout: 5000 });
  });
});
