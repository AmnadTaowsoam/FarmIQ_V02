import React from 'react';
import { Card, CardContent, Typography, Box, Stack, alpha } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: TrendDirection;
    value: string;
    label?: string;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

/**
 * StatCard Component
 * 
 * Display metric cards with value, label, optional icon, and trend indicator.
 * 
 * Example:
 * <StatCard
 *   label="Total Tenants"
 *   value={42}
 *   icon={<Building2 />}
 *   trend={{ direction: 'up', value: '+12%', label: 'vs last month' }}
 *   color="primary"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'primary',
  loading = false,
}) => {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return <TrendingUp size={16} />;
      case 'down':
        return <TrendingDown size={16} />;
      case 'neutral':
        return <Minus size={16} />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      case 'neutral':
        return 'text.secondary';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: `${color}.main`,
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Icon and Label */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {label}
            </Typography>
            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette[color].main, 0.1),
                  color: `${color}.main`,
                }}
              >
                {React.cloneElement(icon as React.ReactElement, { size: 20 })}
              </Box>
            )}
          </Stack>

          {/* Value */}
          <Typography
            variant="h3"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: 28, md: 32 },
            }}
          >
            {loading ? (
              <Box
                sx={{
                  width: 120,
                  height: 40,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
            ) : (
              value
            )}
          </Typography>

          {/* Trend */}
          {trend && !loading && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: getTrendColor(),
                }}
              >
                {getTrendIcon()}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: getTrendColor(),
                }}
              >
                {trend.value}
              </Typography>
              {trend.label && (
                <Typography variant="body2" color="text.secondary">
                  {trend.label}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
