import React from 'react';
import { Box, Typography, Button, Paper, IconButton, Tooltip } from '@mui/material';
import { Copy } from 'lucide-react';
import { getLastRequestId } from '../../hooks/useRequestId';

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  traceId?: string;
  requestId?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = "Something went wrong", 
  message = "We encountered an unexpected error. Please try again.", 
  code, 
  traceId,
  requestId,
  onRetry 
}) => {
  const lastRequestId = requestId || getLastRequestId();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show toast notification
    });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <Paper elevation={0} sx={{ p: 4, textAlign: 'center', maxWidth: 480, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" color="error.main" gutterBottom fontWeight="bold">
            {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
            {message}
        </Typography>
        {(code || traceId || lastRequestId) && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, textAlign: 'left' }}>
                 {code && (
                   <Box display="flex" alignItems="center" gap={1} mb={1}>
                     <Typography variant="caption" fontFamily="monospace">Code: {code}</Typography>
                   </Box>
                 )}
                 {lastRequestId && (
                   <Box display="flex" alignItems="center" gap={1} mb={1}>
                     <Typography variant="caption" fontFamily="monospace">Request ID: {lastRequestId}</Typography>
                     <Tooltip title="Copy Request ID">
                       <IconButton size="small" onClick={() => copyToClipboard(lastRequestId!)}>
                         <Copy size={14} />
                       </IconButton>
                     </Tooltip>
                   </Box>
                 )}
                 {traceId && (
                   <Box display="flex" alignItems="center" gap={1}>
                     <Typography variant="caption" fontFamily="monospace">Trace ID: {traceId}</Typography>
                     <Tooltip title="Copy Trace ID">
                       <IconButton size="small" onClick={() => copyToClipboard(traceId)}>
                         <Copy size={14} />
                       </IconButton>
                     </Tooltip>
                   </Box>
                 )}
            </Box>
        )}
        {onRetry && (
            <Button variant="contained" onClick={onRetry}>
                Try Again
            </Button>
        )}
      </Paper>
    </Box>
  );
};
