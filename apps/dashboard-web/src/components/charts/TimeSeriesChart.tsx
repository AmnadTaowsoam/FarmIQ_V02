import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Skeleton, Paper, useTheme, alpha } from '@mui/material';

export interface TimeSeriesDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  lines: Array<{
    key: string;
    label: string;
    color?: string;
    strokeWidth?: number;
    fillGradient?: boolean;
  }>;
  xAxisKey?: string;
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const theme = useTheme();
  
  if (active && payload && payload.length) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          border: '1px solid', 
          borderColor: alpha(theme.palette.divider, 0.1),
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          minWidth: 180
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {new Date(label).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, boxShadow: `0 0 0 2px ${alpha(entry.color, 0.2)}` }} />
                <Typography variant="body2" color="text.primary" fontWeight={500}>
                {entry.name}
                </Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="text.primary">
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  lines,
  xAxisKey = 'timestamp',
  loading = false,
  height = 300,
  showLegend = true,
}) => {
  const theme = useTheme();

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
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={`color-${line.key}`} id={`color-${line.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={(value) => new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short' })}
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
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.palette.divider, strokeWidth: 1, strokeDasharray: '4 4' }} />
        {showLegend && (
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 600 }}
          />
        )}
        {lines.map((line) => (
          <Area
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color || theme.palette.primary.main}
            strokeWidth={line.strokeWidth || 3}
            fillOpacity={1}
            fill={`url(#color-${line.key})`}
            activeDot={{ 
                r: 6, 
                strokeWidth: 4, 
                stroke: theme.palette.background.paper, 
                fill: line.color || theme.palette.primary.main 
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
