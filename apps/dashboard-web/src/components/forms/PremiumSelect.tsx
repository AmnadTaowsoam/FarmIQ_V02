import React from 'react';
import { FormControl, InputLabel, Select, SelectProps, MenuItem, alpha, useTheme, styled } from '@mui/material';

const StyledFormControl = styled(FormControl)(({ theme }) => ({
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
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
  },
}));

export interface PremiumSelectOption {
    value: string | number;
    label: string;
}

interface PremiumSelectProps extends SelectProps {
    label?: string;
    options?: PremiumSelectOption[];
}

export const PremiumSelect: React.FC<PremiumSelectProps> = ({ label, options, children, ...props }) => {
  return (
    <StyledFormControl fullWidth variant="outlined">
      {label && <InputLabel>{label}</InputLabel>}
      <Select label={label} {...props}>
        {options 
            ? options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                </MenuItem>
              ))
            : children
        }
      </Select>
    </StyledFormControl>
  );
};
