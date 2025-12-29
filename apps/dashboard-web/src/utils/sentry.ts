/**
 * Sentry integration (optional, only initializes if DSN is provided)
 */

let sentryInitialized = false;

export const initSentry = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || sentryInitialized) {
    return;
  }

  try {
    // Dynamic import to avoid bundling Sentry if not used
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE || 'development',
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay(),
        ],
        tracesSampleRate: 0.1, // 10% of transactions
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, _hint) {
          // Scrub PII
          if (event.user) {
            delete event.user.email;
            delete event.user.username;
          }
          
          // Only include tenantId as tag, not in user data
          if (event.tags) {
            // tenantId will be added via setTag elsewhere
          }
          
          return event;
        },
      });
      
      sentryInitialized = true;
    }).catch((error) => {
      console.warn('Failed to initialize Sentry', error);
    });
  } catch (error) {
    console.warn('Sentry not available', error);
  }
};

// Initialize on module load if DSN is present
if (typeof window !== 'undefined') {
  initSentry();
}

