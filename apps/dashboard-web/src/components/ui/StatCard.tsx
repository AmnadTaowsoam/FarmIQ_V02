import React from 'react';
import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  loading = false,
  color = 'primary',
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={32} sx={{ mt: 1 }} />
          {subtitle && <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {icon && (
            <Box color={`${color}.main`}>
              {icon}
            </Box>
          )}
        </Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            {trend.isPositive ? (
              <TrendingUp size={16} color="green" />
            ) : (
              <TrendingDown size={16} color="red" />
            )}
            <Typography variant="caption" color={trend.isPositive ? 'success.main' : 'error.main'}>
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

