import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box, alpha, useTheme } from '@mui/material';
import { useActiveContext, TimeRangePreset } from '../../contexts/ActiveContext';

export const TimeRangeSelector: React.FC = () => {
    const theme = useTheme();
    const { timeRange, setTimeRangePreset } = useActiveContext();

    const handleChange = (
        _event: React.MouseEvent<HTMLElement>,
        newAlignment: TimeRangePreset | null,
    ) => {
        if (newAlignment !== null) {
            setTimeRangePreset(newAlignment);
        }
    };

    return (
        <Box sx={{ 
            p: 0.5, 
            borderRadius: 2.5, 
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            border: '1px solid',
            borderColor: 'divider',
            height: 36,
            display: 'flex',
            alignItems: 'center'
        }}>
            <ToggleButtonGroup
                value={timeRange.preset}
                exclusive
                onChange={handleChange}
                size="small"
                sx={{ 
                    '& .MuiToggleButton-root': {
                        border: 'none',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderRadius: 2,
                        minWidth: 44,
                        color: 'text.secondary',
                        '&.Mui-selected': {
                            bgcolor: 'background.paper',
                            color: 'primary.main',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            '&:hover': {
                                bgcolor: 'background.paper',
                            }
                        },
                        '&:hover': {
                            bgcolor: 'action.hover'
                        }
                    }
                }}
            >
                <ToggleButton value="24h">24h</ToggleButton>
                <ToggleButton value="7d">7d</ToggleButton>
                <ToggleButton value="30d">30d</ToggleButton>
                <ToggleButton value="90d">90d</ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
};
