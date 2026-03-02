import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

export const ForbiddenPage: React.FC = () => {
  const theme = useTheme();
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 2,
        bgcolor: theme.palette.background.default,
      }}
    >
      <ShieldX size={64} color={theme.palette.error.main} strokeWidth={1.5} />
      <Typography variant="h4" fontWeight={600}>
        403 – Forbidden
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={360}>
        You do not have permission to access this resource.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => void logout()}>
        Sign Out & Login
      </Button>
    </Box>
  );
};
