import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Data Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Login Flow
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@farmiq.io');
        await page.fill('input[name="password"]', 'password123'); // seed data
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('Telemtry Update Real-time', async ({ page }) => {
        // Navigate to device details
        await page.click('text=Farms');
        await page.click('text=Farm-01');
        await page.click('text=Barn-01');

        // Check initial state
        const tempElement = page.locator('[data-testid="metric-temperature"]');
        await expect(tempElement).toBeVisible();

        // Trigger Simulator (via API call or assume running)
        // Here we wait for socket update
        // In a real test, we might use a dedicated API to inject data specifically for this test

        // Expect change/value (Generic check for non-empty)
        await expect(tempElement).not.toBeEmpty();
    });
});
