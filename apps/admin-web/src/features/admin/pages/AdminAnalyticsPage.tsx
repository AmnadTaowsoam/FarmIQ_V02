import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Activity,
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface ChartData {
  label: string;
  value: number;
}

const metrics: AnalyticsMetric[] = [
  { label: 'Active Tenants', value: 156, change: 12.5, trend: 'up', color: 'primary' },
  { label: 'Total Users', value: '12,450', change: 8.3, trend: 'up', color: 'success' },
  { label: 'API Requests', value: '1.2M', change: 15.2, trend: 'up', color: 'info' },
  { label: 'Avg Response Time', value: '245ms', change: -5.8, trend: 'down', color: 'warning' },
];

const tenantGrowth: ChartData[] = [
  { label: 'Jan', value: 120 },
  { label: 'Feb', value: 135 },
  { label: 'Mar', value: 142 },
  { label: 'Apr', value: 148 },
  { label: 'May', value: 156 },
];

const userGrowth: ChartData[] = [
  { label: 'Jan', value: 9500 },
  { label: 'Feb', value: 10200 },
  { label: 'Mar', value: 10800 },
  { label: 'Apr', value: 11500 },
  { label: 'May', value: 12450 },
];

const apiUsage: ChartData[] = [
  { label: 'Jan', value: 850000 },
  { label: 'Feb', value: 920000 },
  { label: 'Mar', value: 980000 },
  { label: 'Apr', value: 1050000 },
  { label: 'May', value: 1200000 },
];

const MetricCard: React.FC<{ metric: AnalyticsMetric; delay: number }> = ({ metric, delay }) => {
  const theme = useTheme();
  
  return (
    <FadeIn delay={delay}>
      <PremiumCard sx={{ height: '100%' }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {metric.label}
            </Typography>
            <Box sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette[metric.color].main, 0.1),
              color: `${metric.color}.main`
            }}>
              {metric.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </Box>
          </Box>
          
          <Typography variant="h4" fontWeight={800}>
            {metric.value}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="body2"
              fontWeight={600}
              color={metric.trend === 'up' ? 'success.main' : 'error.main'}
            >
              {metric.change > 0 ? '+' : ''}{metric.change}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              vs last month
            </Typography>
          </Stack>
        </Stack>
      </PremiumCard>
    </FadeIn>
  );
};

const SimpleBarChart: React.FC<{
  data: ChartData[];
  title: string;
  color: string;
  delay: number
}> = ({ data, title, color, delay }) => {
  const theme = useTheme();
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <FadeIn delay={delay}>
      <PremiumCard title={title} sx={{ height: '100%' }}>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200 }}>
            {data.map((item, index) => (
              <Stack key={item.label} spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {item.value.toLocaleString()}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: `${(item.value / maxValue) * 100}%`,
                    bgcolor: color,
                    borderRadius: 2,
                    minHeight: 40,
                    transition: 'height 0.3s ease',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {item.label}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
      </PremiumCard>
    </FadeIn>
  );
};

export const AdminAnalyticsPage: React.FC = () => {
  const theme = useTheme();

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Analytics"
        subtitle="Platform-wide metrics and performance insights"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Calendar size={18} />}
              sx={{ borderRadius: 2 }}
            >
              Date Range
            </Button>
            <Button
              variant="outlined"
              startIcon={<Filter size={18} />}
              sx={{ borderRadius: 2 }}
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
          </Stack>
        }
      />

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <MetricCard metric={metric} delay={index * 100} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <SimpleBarChart
            data={tenantGrowth}
            title="Tenant Growth"
            color={theme.palette.primary.main}
            delay={500}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SimpleBarChart
            data={userGrowth}
            title="User Growth"
            color={theme.palette.success.main}
            delay={600}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <SimpleBarChart
            data={apiUsage}
            title="API Usage (Monthly)"
            color={theme.palette.info.main}
            delay={700}
          />
        </Grid>
      </Grid>

      {/* Top Performing Tenants */}
      <PremiumCard title="Top Performing Tenants" sx={{ mb: 3 }}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[
            { name: 'AgriTech Solutions', users: 2450, growth: 23.5 },
            { name: 'FarmData Corp', users: 1890, growth: 18.2 },
            { name: 'Smart Agriculture Ltd', users: 1560, growth: 15.8 },
            { name: 'Crop Analytics Inc', users: 1230, growth: 12.4 },
            { name: 'Precision Farming Co', users: 980, growth: 9.7 },
          ].map((tenant, index) => (
            <Box
              key={tenant.name}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                bgcolor: index % 2 === 0 ? 'action.hover' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  transform: 'translateX(4)'
                }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }}>
                  <Building2 size={20} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    {tenant.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tenant.users.toLocaleString()} users
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <TrendingUp size={16} color={theme.palette.success.main} />
                <Typography variant="body2" fontWeight={600} color="success.main">
                  +{tenant.growth}%
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </PremiumCard>

      {/* System Health */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FadeIn delay={800}>
            <PremiumCard title="System Health" sx={{ height: '100%' }}>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>API Gateway</Typography>
                    <Chip label="99.9%" size="small" color="success" sx={{ borderRadius: 1 }} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={99.9}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Database</Typography>
                    <Chip label="98.5%" size="small" color="success" sx={{ borderRadius: 1 }} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={98.5}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>MQTT Broker</Typography>
                    <Chip label="97.2%" size="small" color="warning" sx={{ borderRadius: 1 }} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={97.2}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
        <Grid item xs={12} md={4}>
          <FadeIn delay={900}>
            <PremiumCard title="Resource Usage" sx={{ height: '100%' }}>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>CPU Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>67%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={67}
                    color="info"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Memory Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>72%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={72}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Storage Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>45%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={45}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
        <Grid item xs={12} md={4}>
          <FadeIn delay={1000}>
            <PremiumCard title="Quick Actions" sx={{ height: '100%' }}>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={18} />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                >
                  Refresh Analytics
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download size={18} />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                >
                  Download Report
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Activity size={18} />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                >
                  View System Logs
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Users size={18} />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                >
                  Export User Data
                </Button>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
      </Grid>
    </Box>
  );
};
