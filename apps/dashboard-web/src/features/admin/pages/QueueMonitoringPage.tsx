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
  LinearProgress,
  Stack,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { Inbox, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export const QueueMonitoringPage: React.FC = () => {
  // Mock data
  const queueStats = {
    totalQueues: 8,
    totalMessages: 3456,
    processingRate: 234, // messages per minute
    deadLetterCount: 12,
  };

  const queues = [
    { name: 'telemetry-ingestion', depth: 1234, maxDepth: 10000, processingRate: 150, status: 'healthy' },
    { name: 'device-commands', depth: 45, maxDepth: 1000, processingRate: 25, status: 'healthy' },
    { name: 'alert-notifications', depth: 789, maxDepth: 5000, processingRate: 45, status: 'warning' },
    { name: 'audit-events', depth: 234, maxDepth: 5000, processingRate: 14, status: 'healthy' },
    { name: 'sync-outbox', depth: 1154, maxDepth: 10000, processingRate: 0, status: 'error' },
  ];

  const deadLetterMessages = [
    { id: '1', queue: 'telemetry-ingestion', message: 'Invalid JSON payload', failedAt: '2 hours ago', retries: 3 },
    { id: '2', queue: 'device-commands', message: 'Device not found', failedAt: '5 hours ago', retries: 3 },
    { id: '3', queue: 'alert-notifications', message: 'Email delivery failed', failedAt: '1 day ago', retries: 3 },
  ];

  const getQueueStatus = (depth: number, maxDepth: number) => {
    const percentage = (depth / maxDepth) * 100;
    if (percentage > 80) return 'error';
    if (percentage > 60) return 'warning';
    return 'healthy';
  };

  return (
    <Box>
      <AdminPageHeader
        title="Queue Monitoring"
        subtitle="Monitor message queues and processing"
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Inbox />}
            value={queueStats.totalQueues.toString()}
            label="Active Queues"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<CheckCircle />}
            value={queueStats.totalMessages.toLocaleString()}
            label="Total Messages"
            color="info"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<TrendingUp />}
            value={`${queueStats.processingRate}/min`}
            label="Processing Rate"
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<AlertTriangle />}
            value={queueStats.deadLetterCount.toString()}
            label="Dead Letter"
            color="error"
          />
        </Grid>
      </Grid>

      {/* Queue Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Queue Status
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Queue Name</TableCell>
                  <TableCell>Depth</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell align="right">Processing Rate</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queues.map((queue) => {
                  const percentage = (queue.depth / queue.maxDepth) * 100;
                  const status = getQueueStatus(queue.depth, queue.maxDepth);
                  return (
                    <TableRow key={queue.name}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {queue.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {queue.depth.toLocaleString()} / {queue.maxDepth.toLocaleString()}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{ height: 4, borderRadius: 1 }}
                            color={status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'primary'}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>{percentage.toFixed(1)}%</TableCell>
                      <TableCell align="right">{queue.processingRate}/min</TableCell>
                      <TableCell>
                        <Chip
                          label={status.toUpperCase()}
                          color={status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dead Letter Queue */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Dead Letter Queue
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Queue</TableCell>
                  <TableCell>Error Message</TableCell>
                  <TableCell>Failed At</TableCell>
                  <TableCell align="right">Retries</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deadLetterMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {msg.queue}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error">
                        {msg.message}
                      </Typography>
                    </TableCell>
                    <TableCell>{msg.failedAt}</TableCell>
                    <TableCell align="right">{msg.retries}</TableCell>
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
