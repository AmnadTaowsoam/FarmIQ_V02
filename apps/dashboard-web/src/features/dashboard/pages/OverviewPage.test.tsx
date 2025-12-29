import { render, screen, waitFor } from '@testing-library/react';
import { OverviewPage } from './OverviewPage';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../../../mocks/server';
import { BrowserRouter } from 'react-router-dom';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock components that use generic context if needed, or wrap in provider
const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('OverviewPage Integration', () => {
    it('renders loading state initially', () => {
        render(<OverviewPage />, { wrapper: Wrapper });
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders dashboard data after fetch', async () => {
        render(<OverviewPage />, { wrapper: Wrapper });
        
        await waitFor(() => {
            expect(screen.getByText('Total Farms')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument(); // From mock
        });
    });
});
