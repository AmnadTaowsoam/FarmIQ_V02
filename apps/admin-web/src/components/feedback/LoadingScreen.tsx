import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{
        backgroundColor: 'background.default',
      }}
    >
      <CircularProgress size={40} />
      {message && (
        <Typography variant="h6" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};
