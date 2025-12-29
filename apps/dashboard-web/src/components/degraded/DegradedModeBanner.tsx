import React from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useDegradedMode } from '../../hooks/useDegradedMode';
import { formatRelativeTime } from '../../utils/formatting';

export const DegradedModeBanner: React.FC = () => {
  const { isDegraded, lastUpdate } = useDegradedMode();
  const theme = useTheme();

  if (!isDegraded) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      variant="outlined"
      sx={{
        mt: 2,
        mb: 2,
        bgcolor: alpha(theme.palette.warning.main, 0.12),
        color: 'text.primary',
        borderColor: alpha(theme.palette.warning.main, 0.6),
        '& .MuiAlert-icon': {
          color: theme.palette.warning.main,
        },
        '& .MuiAlertTitle-root': {
          fontWeight: 700,
        },
      }}
    >
      <AlertTitle>Realtime Unavailable</AlertTitle>
      {lastUpdate ? (
        <>Showing last update from {formatRelativeTime(lastUpdate)}</>
      ) : (
        <>Unable to connect to server. Showing cached data if available.</>
      )}
    </Alert>
  );
};

