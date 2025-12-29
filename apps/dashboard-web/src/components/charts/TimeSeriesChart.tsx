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
import { Box, Typography, Skeleton, Paper, useTheme } from '@mui/material';

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
  if (active && payload && payload.length) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 1.5, 
          border: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          borderRadius: 1.5
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {new Date(label).toLocaleString()}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
            <Typography variant="body2" fontWeight="bold">
              {entry.name}: {entry.value}
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
    return <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 2 }} />;
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
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={`color-${line.key}`} id={`color-${line.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={(value) => new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short' })}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
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
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

