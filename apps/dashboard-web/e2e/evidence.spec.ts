import { test, expect } from '@playwright/test';

test.describe('Evidence Collection', () => {
    test('capture screenshots of key pages', async ({ page }) => {
        // 1. Login
        await page.goto('http://localhost:5173/login');
        await page.waitForTimeout(1000); // Wait for hydration
        await page.screenshot({ path: 'evidence/ui/01-login.png' });

        await page.getByPlaceholder('admin@farmiq.com').fill('admin@farmiq.com');
        await page.getByPlaceholder('••••••••').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // 2. Overview
        await page.waitForURL('**/overview');
        await page.waitForTimeout(2000); // Allow charts/animations
        await page.screenshot({ path: 'evidence/ui/02-overview.png' });

        // 3. Farms
        await page.goto('http://localhost:5173/farms');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/ui/03-farms-list.png' });

        // 4. Barns
        await page.goto('http://localhost:5173/barns');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/ui/04-barns-list.png' });

        // 5. WeighVision Sessions
        await page.goto('http://localhost:5173/weighvision/sessions');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/ui/05-weighvision-sessions.png' });

        // 6. Feeding
        await page.goto('http://localhost:5173/feeding/daily');
        await page.waitForTimeout(2000); // Wait for chart
        await page.screenshot({ path: 'evidence/ui/06-feeding-daily.png' });

        // 7. Sensors
        await page.goto('http://localhost:5173/sensors/matrix');
        await page.waitForTimeout(2000); // Wait for polling/grid
        await page.screenshot({ path: 'evidence/ui/07-sensors-matrix.png' });

        // 8. Admin Users
        await page.goto('http://localhost:5173/admin/users');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/ui/08-admin-users.png' });

        // 9. Settings
        await page.goto('http://localhost:5173/settings');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/ui/09-settings.png' });
    });
});
