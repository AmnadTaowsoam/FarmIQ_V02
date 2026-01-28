import React from 'react';
import { TextField, TextFieldProps, alpha, useTheme, styled } from '@mui/material';

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: alpha(theme.palette.divider, 0.6),
      borderWidth: 1,
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
      '& fieldset': {
        borderColor: theme.palette.text.secondary,
      },
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
      '& fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    },
    '&.Mui-error': {
      '& fieldset': {
        borderColor: theme.palette.error.main,
      },
      '&.Mui-focused': {
        boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.15)}`,
      },
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}));

export const PremiumTextField: React.FC<TextFieldProps> = (props) => {
  return <StyledTextField variant="outlined" fullWidth {...props} />;
};
