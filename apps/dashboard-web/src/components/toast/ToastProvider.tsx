import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertTitle, Stack, AlertColor } from '@mui/material';

export interface ToastOptions {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  persist?: boolean;
}

export interface ToastMessage extends ToastOptions {
  id: string;
  message: string;
  severity: AlertColor;
}

interface ToastContextType {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, severity: AlertColor, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, severity, ...options }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = (msg: string, opt?: ToastOptions) => addToast(msg, 'success', opt);
  const error = (msg: string, opt?: ToastOptions) => addToast(msg, 'error', opt);
  const info = (msg: string, opt?: ToastOptions) => addToast(msg, 'info', opt);
  const warning = (msg: string, opt?: ToastOptions) => addToast(msg, 'warning', opt);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, removeToast }}>
      {children}
      <Stack 
        spacing={1} 
        sx={{ 
          position: 'fixed', 
          top: 24, 
          right: 24, 
          zIndex: 9999,
          maxWidth: 400,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <Snackbar
            key={toast.id}
            open={true}
            autoHideDuration={toast.persist ? null : (toast.severity === 'error' ? 6000 : 3500)}
            onClose={() => removeToast(toast.id)}
            sx={{ position: 'relative', pointerEvents: 'auto' }}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              onClose={() => removeToast(toast.id)}
              severity={toast.severity}
              variant="filled"
              elevation={6}
              sx={{ 
                width: '100%', 
                borderRadius: 2,
                fontWeight: 600,
                '& .MuiAlert-message': { width: '100%' }
              }}
              action={
                toast.actionLabel && toast.onAction ? (
                  <React.Fragment>
                    <Stack direction="row" spacing={1}>
                      <Box 
                        component="span" 
                        onClick={toast.onAction}
                        sx={{ 
                          cursor: 'pointer', 
                          textDecoration: 'underline', 
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase'
                        }}
                      >
                        {toast.actionLabel}
                      </Box>
                    </Stack>
                  </React.Fragment>
                ) : null
              }
            >
              <AlertTitle sx={{ fontWeight: 800, mb: toast.description ? 0.5 : 0 }}>
                {toast.message}
              </AlertTitle>
              {toast.description && (
                <Box sx={{ fontSize: '0.8125rem', opacity: 0.9, fontWeight: 500 }}>
                  {toast.description}
                </Box>
              )}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </ToastContext.Provider>
  );
};

// Box helper since it might not be in scope for the provider
const Box = ({ children, sx, component: Component = 'div', ...props }: any) => {
    const Tag = Component;
    return <Tag style={{ display: 'inline-block', ...sx }} {...props}>{children}</Tag>;
};
