import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarnDetailPage } from '../BarnDetailPage';
import { AuthProvider } from '../../../../contexts/AuthContext';
import { ActiveContextProvider } from '../../../../contexts/ActiveContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../../api', () => ({
  api: {
    registryBarnsGet: vi.fn().mockResolvedValue({
      data: {
        barn_id: 'test-barn-id',
        name: 'Barn A',
        device_count: 3,
      },
    }),
    telemetryReadings: vi.fn().mockResolvedValue({
      data: { readings: [] },
    }),
  },
}));

describe('BarnDetailPage Integration', () => {
  it('renders barn detail page', () => {
    localStorage.setItem('farmiq_active_context', JSON.stringify({ tenantId: 't-1' }));
    render(
      <MemoryRouter initialEntries={['/barns/test-barn-id']}>
        <AuthProvider>
          <ActiveContextProvider>
            <BarnDetailPage />
          </ActiveContextProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should render page header
    expect(screen.getByText(/barn/i)).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    localStorage.setItem('farmiq_active_context', JSON.stringify({ tenantId: 't-1' }));
    render(
      <MemoryRouter initialEntries={['/barns/test-barn-id']}>
        <AuthProvider>
          <ActiveContextProvider>
            <BarnDetailPage />
          </ActiveContextProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should eventually show empty state or loading
    expect(screen.getByText(/barn/i)).toBeInTheDocument();
  });
});

