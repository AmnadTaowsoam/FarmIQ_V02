import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Typography, alpha, useTheme, Stack } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Activity, Wifi, Binary } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { BasicTable } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type DeviceDetail = components['schemas']['DeviceDetailResponse']['data'];
type TelemetryReading = components['schemas']['TelemetryReading'];

export const DeviceDetailPage: React.FC = () => {
  const theme = useTheme();
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { tenantId, timeRange } = useActiveContext();
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!tenantId || !deviceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await api.devices.get(deviceId as string, { tenantId });
        const deviceResponse = unwrapApiResponse<any>(response);
        if (deviceResponse) {
          setDevice({
            ...deviceResponse,
            device_id: deviceResponse.device_id || (deviceResponse as any).id,
            last_seen: deviceResponse.last_seen || (deviceResponse as any).lastSeen,
          } as DeviceDetail);
        } else {
          setDevice(null);
        }
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [tenantId, deviceId]);

  useEffect(() => {
    const fetchReadings = async () => {
      if (!tenantId || !deviceId) return;
      setReadingsLoading(true);
      try {
        const response = await api.telemetryReadings({
          tenant_id: tenantId,
          device_id: deviceId,
          start_time: timeRange.start.toISOString(),
          end_time: timeRange.end.toISOString(),
          limit: 200,
        });
        setReadings(response.data?.readings || []);
      } catch (err) {
        console.error('Failed to load telemetry readings', err);
        setReadings([]);
      } finally {
        setReadingsLoading(false);
      }
    };

    fetchReadings();
  }, [tenantId, deviceId, timeRange.start, timeRange.end]);

  const metrics = useMemo(() => {
    const latest: Record<string, number> = {};
    readings.forEach((r) => {
      if (r.metric_type && r.metric_value !== undefined) {
        latest[r.metric_type] = r.metric_value;
      }
    });
    return latest;
  }, [readings]);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Device Detail" subtitle="Detailed hardware diagnostics and telemetry stream" />
        <LoadingCard title="Loading device details" lines={4} />
      </Box>
    );
  }
  if (error) return <ErrorState title="Failed to load device" message={error.message} />;
  if (!device) {
    return (
      <Box>
        <PageHeader title="Device Detail" subtitle="Detailed hardware diagnostics and telemetry stream" />
        <EmptyState title="Device not found" description="No device data available for this ID." />
      </Box>
    );
  }

  const readingColumns: any[] = [
    { id: 'timestamp', label: 'Timestamp', format: (val: string) => val ? new Date(val).toLocaleString() : '—' },
    { id: 'metric_type', label: 'Metric', format: (val: string) => <Typography variant="body2" fontWeight="600" sx={{ textTransform: 'capitalize' }}>{val}</Typography> },
    { id: 'metric_value', label: 'Value', align: 'right', format: (val: number) => <strong>{val.toFixed(2)}</strong> },
    { id: 'unit', label: 'Unit' },
  ];

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title={device.name || device.device_id || deviceId}
        subtitle="Detailed hardware diagnostics and telemetry stream"
        actions={[
            { 
                label: 'Back', 
                onClick: () => navigate('/devices'), 
                startIcon: <ArrowLeft size={18} />,
                variant: 'outlined'
            },
            {
                label: 'Configure',
                variant: 'contained',
                onClick: () => {}
            }
        ]}
      />

      <Grid container spacing={3} mt={1}>
        {[
            { label: 'Device Type', value: device.type || 'Generic IoT', icon: <Cpu size={24} />, color: 'primary.main' },
            { label: 'Current Status', value: device.status || 'Active', icon: <Wifi size={24} />, color: 'success.main', isStatus: true },
            { label: 'Firmware', value: device.firmware_version || 'v1.0.4', icon: <Binary size={24} />, color: 'info.main' },
        ].map((stat, idx) => (
            <Grid item xs={12} md={4} key={idx} sx={{ animation: `fadeIn 0.4s ease-out ${idx * 0.1}s both` }}>
                <PremiumCard sx={{ p: 1, bgcolor: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(10px)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            p: 1.5, 
                            bgcolor: alpha(stat.color.split('.')[0] === 'primary' ? theme.palette.primary.main : stat.color.split('.')[0] === 'success' ? theme.palette.success.main : theme.palette.info.main, 0.1), 
                            color: stat.color, 
                            borderRadius: 2 
                        }}>
                            {stat.icon}
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
                            {stat.isStatus ? (
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip status={stat.value === 'active' || stat.value === 'Active' ? 'success' : 'info'} label={stat.value.toUpperCase()} />
                                </Box>
                            ) : (
                                <Typography variant="h5" fontWeight="800">{stat.value}</Typography>
                            )}
                        </Box>
                    </Box>
                </PremiumCard>
            </Grid>
        ))}

        <Grid item xs={12}>
            <PremiumCard title="System Reliability">
                <Grid container spacing={4}>
                    {[
                        { label: '24h Uptime', value: device.uptime_percent_24h || 99.9, color: 'success.main' },
                        { label: '7d Uptime', value: device.uptime_percent_7d || 99.5, color: 'primary.main' },
                        { label: '30d Uptime', value: device.uptime_percent_30d || 98.2, color: 'info.main' },
                    ].map((uptime, i) => (
                        <Grid item xs={12} md={4} key={i}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h3" fontWeight="800" color={uptime.color}>{uptime.value}%</Typography>
                                <Typography variant="body2" color="text.secondary" fontWeight="600">{uptime.label}</Typography>
                                <Box sx={{ mt: 2, height: 4, bgcolor: alpha(theme.palette.divider, 0.5), borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ width: `${uptime.value}%`, height: '100%', bgcolor: uptime.color }} />
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </PremiumCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <PremiumCard title="Latest Metrics" sx={{ height: '100%' }}>
            <Stack spacing={2.5}>
              {Object.entries(metrics).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.background.default, 0.5), border: '1px solid', borderColor: 'divider' }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 1.5 }}>
                         <Activity size={18} />
                      </Box>
                      <Typography variant="body1" fontWeight="600" sx={{ textTransform: 'capitalize' }}>{key}</Typography>
                   </Box>
                   <Typography variant="h6" fontWeight="700">{value}</Typography>
                </Box>
              ))}
              {!Object.keys(metrics).length && (
                <EmptyState
                  size="sm"
                  icon={<Wifi size={28} />}
                  title="No recent telemetry readings"
                  description="Telemetry will appear when the device reports metrics."
                />
              )}
            </Stack>
          </PremiumCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <PremiumCard title="Telemetry Stream" noPadding sx={{ height: '100%' }}>
            <BasicTable<TelemetryReading>
              columns={readingColumns}
              data={readings}
              loading={readingsLoading}
              emptyMessage="No readings found in the selected time range."
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
