import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid,
  Stack,
  Skeleton
} from '@mui/material';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer 
} from 'recharts';

export interface MetricCardProps {
    title: string;
    value: string;
    subValue?: string;
    icon?: React.ReactNode;
    color?: string;
    chartData?: any[];
    alert?: boolean;
    loading?: boolean;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
}

export function MetricCard({ 
    title, 
    value, 
    subValue, 
    icon, 
    color = '#10b981', 
    chartData, 
    alert,
    loading,
    xs = 12, sm = 6, lg = 3
}: MetricCardProps) {
    return (
        <Grid item xs={xs} sm={sm} lg={lg}>
            <Card sx={{ height: '100%', borderColor: alert ? 'error.main' : undefined, borderWidth: alert ? 1 : undefined }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                            {title.toUpperCase()}
                        </Typography>
                        {icon}
                    </Stack>
                    
                    {loading ? (
                        <>
                            <Skeleton variant="rectangular" width="60%" height={40} sx={{ mb: 1, borderRadius: 1 }} />
                            <Skeleton variant="text" width="40%" />
                        </>
                    ) : (
                        <>
                            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                                {value}
                            </Typography>
                            {subValue && (
                                <Typography variant="body2" color={alert ? "error.main" : "text.secondary"} sx={{ fontWeight: 'medium' }}>
                                    {subValue}
                                </Typography>
                            )}
                        </>
                    )}
                    
                    {/* Tiny Chart */}
                    {(chartData || loading) && (
                        <Box sx={{ height: 40, mt: 2 }}>
                            {loading ? (
                                <Skeleton variant="rectangular" width="100%" height="100%" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#grad-${title})`} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Grid>
    );
}
