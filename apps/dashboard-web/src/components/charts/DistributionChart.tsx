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
} from 'recharts';
import { Box, Typography, Skeleton } from '@mui/material';

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
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  loading = false,
  height = 300,
  showLegend = false,
}) => {
  if (loading) {
    return <Skeleton variant="rectangular" width="100%" height={height} />;
  }

  if (!data || data.length === 0) {
    return (
      <Box height={height} display="flex" alignItems="center" justifyContent="center">
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        <Bar dataKey="count" fill="#1976d2" />
      </BarChart>
    </ResponsiveContainer>
  );
};

