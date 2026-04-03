import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Skeleton, Paper, useTheme, alpha, Stack } from '@mui/material';

export interface TimeSeriesDataPoint {
  timestamp: string;
  [key: string]: string | number | null;
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
  timeZone?: string;
  tooltipTimeZone?: string;
}

const formatMetricValue = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return '-';
  if (Math.abs(numericValue) >= 1000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numericValue);
  if (Math.abs(numericValue) >= 100) return numericValue.toFixed(1);
  if (Math.abs(numericValue) >= 10) return numericValue.toFixed(1);
  return numericValue.toFixed(2);
};

const getDateKey = (value: string | number, timeZone?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatTickLabel = (value: string | number, sameDay: boolean, timeZone?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone });
};

const resolveSeriesColor = (entry: any, fallback: string) => {
  const candidate = entry?.color || entry?.stroke || entry?.payload?.stroke || entry?.payload?.color;
  return typeof candidate === 'string' && !candidate.startsWith('url(') ? candidate : fallback;
};

const CustomTooltip = ({ active, payload, label, tooltipTimeZone }: any) => {
  const theme = useTheme();
  const fallbackColor = theme.palette.primary.main;
  
  if (active && payload && payload.length) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2.25,
          border: '1px solid', 
          borderColor: alpha(theme.palette.common.white, 0.22),
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(18px) saturate(180%)',
          borderRadius: 3.5,
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
          minWidth: 210
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={800}
          display="block"
          sx={{ mb: 1.25, letterSpacing: '0.16em' }}
        >
          Point Snapshot
        </Typography>
        <Typography variant="body2" color="text.primary" fontWeight={700} sx={{ mb: 1.25 }}>
          {new Date(label).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', timeZone: tooltipTimeZone })}
        </Typography>
        {payload.map((entry: any, index: number) => (
          (() => {
            const seriesColor = resolveSeriesColor(entry, fallbackColor);
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mt: 0.75,
                  px: 1.25,
                  py: 0.9,
                  borderRadius: 2.5,
                  bgcolor: alpha(seriesColor, 0.08),
                  border: `1px solid ${alpha(seriesColor, 0.14)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: seriesColor, boxShadow: `0 0 0 4px ${alpha(seriesColor, 0.16)}` }} />
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                {entry.name}
                </Typography>
                </Box>
                <Typography variant="body2" fontWeight={800} color="text.primary">
                  {formatMetricValue(entry.value)}
                </Typography>
              </Box>
            );
          })()
        ))}
      </Paper>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  const theme = useTheme();
  const fallbackColor = theme.palette.primary.main;

  if (!payload?.length) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {payload.map((entry: any) => {
        const seriesColor = resolveSeriesColor(entry, fallbackColor);
        return (
          <Box
            key={entry.dataKey}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.65,
              borderRadius: 999,
              bgcolor: alpha(seriesColor, 0.1),
              border: `1px solid ${alpha(seriesColor, 0.18)}`,
              boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', 0.45)}`,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: seriesColor,
                boxShadow: `0 0 0 4px ${alpha(seriesColor, 0.12)}`,
              }}
            />
            <Typography variant="caption" fontWeight={700} color="text.primary">
              {entry.value}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  lines,
  xAxisKey = 'timestamp',
  loading = false,
  height = 300,
  showLegend = true,
  timeZone,
  tooltipTimeZone,
}) => {
  const theme = useTheme();
  const chartId = React.useId().replace(/:/g, '');
  const firstTimestamp = data?.[0]?.[xAxisKey];
  const lastTimestamp = data?.[data.length - 1]?.[xAxisKey];
  const sameDay =
    !!firstTimestamp &&
    !!lastTimestamp &&
    getDateKey(firstTimestamp, timeZone) === getDateKey(lastTimestamp, timeZone);

  if (loading) {
    return <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 3 }} />;
  }

  if (!data || data.length === 0) {
    return (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          background: `linear-gradient(180deg, ${alpha('#F8FAFC', 0.98)} 0%, ${alpha('#EEF2F6', 0.98)} 100%)`,
        }}
      >
        <Typography color="text.secondary" fontWeight={600}>No data available</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.95)}`,
        background: `
          linear-gradient(180deg, ${alpha('#F8FAFC', 0.98)} 0%, ${alpha('#EEF2F6', 0.98)} 100%)
        `,
        boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', 0.75)}`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${alpha(theme.palette.divider, 0.12)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(theme.palette.divider, 0.06)} 1px, transparent 1px)`,
          backgroundSize: '100% 48px, 64px 100%',
          pointerEvents: 'none',
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 18, left: 2, bottom: 8 }}>
          <defs>
            {lines.map((line) => (
              <React.Fragment key={`defs-${chartId}-${line.key}`}>
                <linearGradient id={`color-${chartId}-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0.16} />
                  <stop offset="55%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={line.color || theme.palette.primary.main} stopOpacity={0} />
                </linearGradient>
                <filter id={`glow-${chartId}-${line.key}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor={alpha(line.color || theme.palette.primary.main, 0.12)} />
                </filter>
              </React.Fragment>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="2 10" vertical={false} stroke={alpha(theme.palette.divider, 0.65)} />
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={(value) => formatTickLabel(value, sameDay, timeZone)}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            minTickGap={28}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 700 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(value) => formatMetricValue(value)}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 700 }}
          />
          <Tooltip
            content={<CustomTooltip tooltipTimeZone={tooltipTimeZone || timeZone} />}
            cursor={{ stroke: alpha(theme.palette.secondary.main, 0.2), strokeWidth: 1.5, strokeDasharray: '5 6' }}
          />
          {showLegend && <Legend verticalAlign="top" align="left" content={<CustomLegend />} />}
          {lines.map((line) => (
            <React.Fragment key={line.key}>
              <Area
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke="none"
                legendType="none"
                tooltipType="none"
                fillOpacity={1}
                fill={`url(#color-${chartId}-${line.key})`}
                animationDuration={1300}
                animationEasing="ease-out"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color || theme.palette.primary.main}
                strokeWidth={line.strokeWidth || 3}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 4,
                  stroke: theme.palette.background.paper,
                  fill: line.color || theme.palette.primary.main,
                }}
                connectNulls
                filter={`url(#glow-${chartId}-${line.key})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                animationDuration={1450}
                animationEasing="ease-out"
                isAnimationActive
              />
            </React.Fragment>
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
