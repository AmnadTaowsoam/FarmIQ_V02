import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OverviewPage } from '../OverviewPage';
import { AuthProvider } from '../../../../contexts/AuthContext';
import { ActiveContextProvider } from '../../../../contexts/ActiveContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API calls
vi.mock('../../../../api', () => ({
  api: {
    dashboardOverview: vi.fn().mockResolvedValue({
      data: {
        kpis: {
          total_farms: 10,
          total_barns: 50,
          active_devices: 45,
          critical_alerts: 2,
        },
        recent_alerts: [],
        recent_activity: [],
        weight_trend: [],
      },
    }),
  },
}));

describe('OverviewPage Integration', () => {
  it('renders overview page with loading state', async () => {
    localStorage.setItem('farmiq_active_context', JSON.stringify({ tenantId: 't-1' }));
    render(
      <BrowserRouter>
        <AuthProvider>
          <ActiveContextProvider>
            <OverviewPage />
          </ActiveContextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    localStorage.setItem('farmiq_active_context', JSON.stringify({ tenantId: 't-1' }));
    const { api } = await import('../../../../api');
    vi.mocked(api.dashboardOverview).mockRejectedValueOnce(new Error('API Error'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <ActiveContextProvider>
            <OverviewPage />
          </ActiveContextProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

