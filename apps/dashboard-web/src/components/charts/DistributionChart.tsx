import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box, Typography, Skeleton, Paper, useTheme, alpha } from '@mui/material';

export interface DistributionDataPoint {
  range: string;
  count: number;
  [key: string]: string | number;
}

export interface DistributionChartProps {
  data: DistributionDataPoint[];
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
  color?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    const theme = useTheme();
    
    if (active && payload && payload.length) {
      return (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            border: '1px solid', 
            borderColor: alpha(theme.palette.divider, 0.1),
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(12px)',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: payload[0].color }} />
            <Typography variant="body2" fontWeight="bold">
              Count: {payload[0].value}
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  loading = false,
  height = 300,
  showLegend = false,
  color,
}) => {
  const theme = useTheme();
  const barColor = color || theme.palette.primary.main;

  if (loading) {
    return <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 3 }} />;
  }

  if (!data || data.length === 0) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center" bgcolor={alpha(theme.palette.action.disabledBackground, 0.1)} borderRadius={3}>
        <Typography color="text.secondary" fontWeight={500}>No data available</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={1} />
                <stop offset="100%" stopColor={barColor} stopOpacity={0.6} />
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
        <XAxis 
            dataKey="range" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 500 }}
            dy={10}
        />
        <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 500 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.action.hover, 0.5), radius: 4 }} />
        {showLegend && <Legend />}
        <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} animationDuration={1000}>
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColor} fillOpacity={0.8 + (index % 2) * 0.2} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
