import React from 'react';
import { Box, Typography } from '@mui/material';
import { getBFFBaseURL } from '../../api';
import { useActiveContext } from '../../contexts/ActiveContext';

export const ApiDiagnosticsPanel: React.FC = () => {
  const { tenantId, farmId, barnId } = useActiveContext();
  const lastError = (window as any).__lastApiError as
    | {
        status?: number;
        code?: string;
        message?: string;
        requestId?: string;
        traceId?: string;
        path?: string;
      }
    | undefined;

  return (
    <Box
      sx={{
        mt: 2,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(20, 20, 20, 0.6)',
        color: 'common.white',
        fontSize: '0.8rem',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        API Diagnostics (dev)
      </Typography>
      <Typography variant="body2">BFF Base: {getBFFBaseURL()}</Typography>
      <Typography variant="body2">Tenant: {tenantId || 'none'}</Typography>
      <Typography variant="body2">Farm: {farmId || 'none'}</Typography>
      <Typography variant="body2">Barn: {barnId || 'none'}</Typography>
      <Typography variant="body2">
        Last Error: {lastError?.code || 'none'} {lastError?.status ? `(${lastError.status})` : ''}
      </Typography>
      <Typography variant="body2">Trace ID: {lastError?.traceId || '—'}</Typography>
      <Typography variant="body2">Request ID: {lastError?.requestId || '—'}</Typography>
      <Typography variant="body2">Path: {lastError?.path || '—'}</Typography>
    </Box>
  );
};
