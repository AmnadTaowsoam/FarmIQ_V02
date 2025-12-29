import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { Users, TrendingUp, Database } from 'lucide-react';

export const MqttMonitoringPage: React.FC = () => {
  // Mock data
  const mqttStats = {
    brokerStatus: 'healthy' as const,
    connectionCount: 1847,
    messageRate: 2341, // messages per minute
    topicCount: 156,
  };

  const topTopics = [
    { topic: 'telemetry/devices/+/metrics', subscribers: 234, messageRate: 1200 },
    { topic: 'events/devices/+/status', subscribers: 189, messageRate: 450 },
    { topic: 'commands/devices/+/config', subscribers: 156, messageRate: 89 },
    { topic: 'alerts/+/critical', subscribers: 98, messageRate: 12 },
  ];

  const recentConnections = [
    { clientId: 'device-dv-0001', connectedAt: '2 minutes ago', status: 'connected', ip: '10.0.1.45' },
    { clientId: 'device-dv-0002', connectedAt: '5 minutes ago', status: 'connected', ip: '10.0.1.46' },
    { clientId: 'gateway-gw-001', connectedAt: '1 hour ago', status: 'connected', ip: '10.0.2.10' },
    { clientId: 'device-dv-0003', connectedAt: '2 hours ago', status: 'disconnected', ip: '10.0.1.47' },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="MQTT Monitoring"
        subtitle="Monitor MQTT broker and message flow"
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Broker Status
                </Typography>
                <HealthBadge status={mqttStats.brokerStatus} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Users />}
            value={mqttStats.connectionCount.toLocaleString()}
            label="Active Connections"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<TrendingUp />}
            value={`${mqttStats.messageRate.toLocaleString()}/min`}
            label="Message Rate"
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Database />}
            value={mqttStats.topicCount.toString()}
            label="Active Topics"
            color="info"
          />
        </Grid>
      </Grid>

      {/* Top Topics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top Topics by Message Rate
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Topic</TableCell>
                  <TableCell align="right">Subscribers</TableCell>
                  <TableCell align="right">Message Rate (msg/min)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topTopics.map((topic) => (
                  <TableRow key={topic.topic}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {topic.topic}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{topic.subscribers}</TableCell>
                    <TableCell align="right">{topic.messageRate.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recent Connections */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Connections
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client ID</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Connected</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentConnections.map((conn) => (
                  <TableRow key={conn.clientId}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {conn.clientId}
                      </Typography>
                    </TableCell>
                    <TableCell>{conn.ip}</TableCell>
                    <TableCell>{conn.connectedAt}</TableCell>
                    <TableCell>
                      <Chip
                        label={conn.status.toUpperCase()}
                        color={conn.status === 'connected' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
