import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EdgeOpsPage } from '@/pages/EdgeOpsPage';
import { theme } from '@/theme/theme';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SettingsProvider>
            <BrowserRouter>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<Navigate to="/edge-ops" replace />} />
                        <Route path="/edge-ops" element={<EdgeOpsPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Routes>
                </MainLayout>
            </BrowserRouter>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
