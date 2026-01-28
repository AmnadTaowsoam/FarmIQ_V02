import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Box, Typography, useTheme, alpha } from '@mui/material';

export interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  height = 200,
  color,
  formatValue = (v) => v.toString(),
}) => {
  const theme = useTheme();
  const primaryColor = color || theme.palette.primary.main;
  const trackColor = alpha(theme.palette.action.disabled, 0.1);

  // Normalize value to percentage
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  
  const data = [
    { name: 'value', value: percentage },
    { name: 'rest', value: 1 - percentage },
  ];

  return (
    <Box position="relative" height={height} width="100%" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cy="70%"
            innerRadius="60%"
            outerRadius="80%"
            startAngle={180}
            endAngle={0}
            dataKey="value"
            stroke="none"
            cornerRadius={6}
            paddingAngle={0}
          >
            <Cell fill={primaryColor} />
            <Cell fill={trackColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <Box 
        position="absolute" 
        bottom="30%" 
        left={0} 
        right={0} 
        display="flex" 
        flexDirection="column" 
        alignItems="center"
      >
        <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ lineHeight: 1 }}>
          {formatValue(value)}
        </Typography>
        {label && (
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
        )}
      </Box>
      <Box 
        position="absolute" 
        bottom="15%" 
        left={0} 
        right={0} 
        display="flex" 
        justifyContent="space-between" 
        px={4}
      >
        <Typography variant="caption" color="text.disabled" fontWeight={500}>{formatValue(min)}</Typography>
        <Typography variant="caption" color="text.disabled" fontWeight={500}>{formatValue(max)}</Typography>
      </Box>
    </Box>
  );
};
