import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './utils/sentry'; // Initialize Sentry if DSN is provided
import './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

async function prepareApp() {
  if (import.meta.env.VITE_MOCK_MODE === 'true') {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
  return Promise.resolve();
}

prepareApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
});
