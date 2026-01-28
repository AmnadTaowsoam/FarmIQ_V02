import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Box, Typography, useTheme, alpha } from '@mui/material';

export interface ProgressRingProps {
  value: number; // 0 to 100
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  label,
  size = 120,
  strokeWidth = 10,
  color,
  showValue = true,
}) => {
  const theme = useTheme();
  const primaryColor = color || theme.palette.primary.main;
  const trackColor = alpha(theme.palette.action.disabled, 0.1);

  const normalizedValue = Math.min(Math.max(value, 0), 100);
  
  const data = [
    { name: 'completed', value: normalizedValue },
    { name: 'remaining', value: 100 - normalizedValue },
  ];

  return (
    <Box position="relative" width={size} height={size} display="flex" alignItems="center" justifyContent="center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size / 2 - strokeWidth}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={strokeWidth / 2}
            paddingAngle={0}
          >
            <Cell fill={primaryColor} />
            <Cell fill={trackColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {showValue && (
        <Box 
          position="absolute" 
          top={0} 
          left={0} 
          right={0} 
          bottom={0} 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
        >
          <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ lineHeight: 1 }}>
            {Math.round(normalizedValue)}%
          </Typography>
          {label && (
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, fontSize: '0.65rem', textTransform: 'uppercase' }}>
              {label}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
