import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ConnectivityStatus = 'live' | 'cached' | 'offline';

interface StatusBarProps {
  status: ConnectivityStatus;
  lastUpdated?: string;
  onRetry?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, lastUpdated, onRetry }) => {
  const { t } = useTranslation('common');

  const statusColor: 'success' | 'warning' | 'default' =
    status === 'live' ? 'success' : status === 'cached' ? 'warning' : 'default';

  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Chip
          label={t(`status.${status}`)}
          color={statusColor}
          variant={status === 'offline' ? 'outlined' : 'filled'}
        />
        <Typography variant="body2" color="text.secondary">
          {t('status.lastUpdated')}: {lastUpdated || '—'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={onRetry}
        >
          {t('status.retry')}
        </Button>
      </Stack>
    </Box>
  );
};
