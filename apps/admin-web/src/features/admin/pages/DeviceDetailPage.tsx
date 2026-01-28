import React, { useState } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, LinearProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { useDevice } from '../../../api/admin/adminQueries';
import { Server, Wifi, MapPin, Settings, Activity, FileText, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const DeviceDetailPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [activeTab, setActiveTab] = useState(0);

  const { data: device, isLoading, error } = useDevice(deviceId || '');

  if (error) {
    return (
      <Box>
        <AdminPageHeader title="Device Details" />
        <Card>
          <CardContent>
            <Typography color="error">Failed to load device details</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading || !device) {
    return (
      <Box>
        <AdminPageHeader title="Device Details" />
        <Card>
          <CardContent>
            <Typography>Loading device details...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Mock telemetry data
  const telemetryMetrics = [
    { label: 'CPU Usage', value: 45, unit: '%', color: 'success' as const },
    { label: 'Memory Usage', value: 68, unit: '%', color: 'warning' as const },
    { label: 'Disk Usage', value: 32, unit: '%', color: 'success' as const },
    { label: 'Network Traffic', value: 1.2, unit: 'MB/s', color: 'info' as const },
  ];

  const recentEvents = [
    { id: '1', timestamp: new Date(Date.now() - 5 * 60 * 1000), type: 'info', message: 'Device heartbeat received' },
    { id: '2', timestamp: new Date(Date.now() - 15 * 60 * 1000), type: 'warning', message: 'High memory usage detected' },
    { id: '3', timestamp: new Date(Date.now() - 30 * 60 * 1000), type: 'info', message: 'Configuration updated' },
    { id: '4', timestamp: new Date(Date.now() - 60 * 60 * 1000), type: 'success', message: 'Firmware update completed' },
  ];

  return (
    <Box>
      <AdminPageHeader
        title={device.name}
        subtitle={`Device ID: ${device.id}`}
        breadcrumbs={[
          { label: 'Devices', path: '/admin/devices' },
          { label: device.name },
        ]}
      />

      {/* Device Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <StatusPill label={device.type.toUpperCase()} color="info" />
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <HealthBadge
                  status={
                    device.status === 'online'
                      ? 'healthy'
                      : device.status === 'offline'
                      ? 'degraded'
                      : 'critical'
                  }
                  label={device.status.toUpperCase()}
                  showIcon
                />
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Firmware
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {device.firmwareVersion}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Last Seen
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<Server size={16} />} label="Overview" iconPosition="start" />
            <Tab icon={<Wifi size={16} />} label="Connectivity" iconPosition="start" />
            <Tab icon={<MapPin size={16} />} label="Assignments" iconPosition="start" />
            <Tab icon={<Settings size={16} />} label="Config" iconPosition="start" />
            <Tab icon={<Activity size={16} />} label="Telemetry" iconPosition="start" />
            <Tab icon={<FileText size={16} />} label="Events" iconPosition="start" />
            <Tab icon={<Zap size={16} />} label="Actions" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Device Information
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Device ID
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {device.id}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.type.toUpperCase()}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        IP Address
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {device.ipAddress}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Firmware Version
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.firmwareVersion}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Location
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Tenant
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.tenantName}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Farm
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.farmName}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Barn
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {device.barnName || 'Not assigned'}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Connectivity Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Status
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Connection Status
                      </Typography>
                      <HealthBadge
                        status={device.status === 'online' ? 'healthy' : 'degraded'}
                        label={device.status.toUpperCase()}
                        showIcon
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        IP Address
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {device.ipAddress}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Last Heartbeat
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Assignments Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="body1" color="text.secondary">
            Device assignment management coming soon...
          </Typography>
        </TabPanel>

        {/* Config Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="body1" color="text.secondary">
            Device configuration editor coming soon...
          </Typography>
        </TabPanel>

        {/* Telemetry Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            {telemetryMetrics.map((metric) => (
              <Grid item xs={12} sm={6} md={3} key={metric.label}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                      {metric.value}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {metric.unit}
                      </Typography>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={typeof metric.value === 'number' && metric.unit === '%' ? metric.value : 50}
                      color={metric.color}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Events Tab */}
        <TabPanel value={activeTab} index={5}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={event.type.toUpperCase()}
                        color={
                          event.type === 'success'
                            ? 'success'
                            : event.type === 'warning'
                            ? 'warning'
                            : event.type === 'error'
                            ? 'error'
                            : 'info'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.message}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Actions Tab */}
        <TabPanel value={activeTab} index={6}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Actions
                </Typography>
                <Stack spacing={2}>
                  <Button variant="outlined" fullWidth>
                    Restart Device
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Update Firmware
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Reset Configuration
                  </Button>
                  <Button variant="outlined" color="error" fullWidth>
                    Decommission Device
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>
      </Card>
    </Box>
  );
};
