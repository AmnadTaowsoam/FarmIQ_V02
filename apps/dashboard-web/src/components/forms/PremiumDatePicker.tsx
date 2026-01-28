import React from 'react';
import { TextField, TextFieldProps, alpha, useTheme, styled } from '@mui/material';

// Note: This is a simplified wrapper. In a real app with @mui/x-date-pickers, 
// we would wrap DatePicker. Since I don't want to assume x-date-pickers is installed 
// (though it likely is or should be), I'll create a styled native date input fallback 
// that looks premium, or wrap TextField if it's just for display.
// Given the context, I'll create a styled TextField that acts as a date picker trigger or input.

const StyledDatePickerField = styled(TextField)(({ theme }) => ({
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
  },
}));

export const PremiumDatePicker: React.FC<TextFieldProps> = (props) => {
  return (
    <StyledDatePickerField
      type="date"
      variant="outlined"
      fullWidth
      InputLabelProps={{ shrink: true }}
      {...props}
    />
  );
};
