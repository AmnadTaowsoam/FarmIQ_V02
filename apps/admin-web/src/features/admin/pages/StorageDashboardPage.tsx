import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { HardDrive, Database, Archive } from 'lucide-react';

export const StorageDashboardPage: React.FC = () => {
  // Mock data
  const storageStats = {
    totalUsed: 2.4, // TB
    totalCapacity: 10, // TB
    telemetryUsage: 1.2, // TB
    mediaUsage: 0.8, // TB
    auditUsage: 0.4, // TB
  };

  const retentionPolicies = [
    { category: 'Telemetry Data', retention: '365 days', autoDelete: true, compression: true },
    { category: 'Media Files', retention: '90 days', autoDelete: true, compression: false },
    { category: 'Audit Logs', retention: '730 days', autoDelete: false, compression: true },
    { category: 'Backups', retention: '30 days', autoDelete: true, compression: true },
  ];

  const cleanupSchedule = [
    { task: 'Delete expired telemetry', nextRun: 'Tonight at 2:00 AM', lastRun: '1 day ago' },
    { task: 'Delete expired media', nextRun: 'Tonight at 3:00 AM', lastRun: '1 day ago' },
    { task: 'Compress old audit logs', nextRun: 'Sunday at 1:00 AM', lastRun: '6 days ago' },
  ];

  const usagePercentage = (storageStats.totalUsed / storageStats.totalCapacity) * 100;

  return (
    <Box>
      <AdminPageHeader
        title="Storage Dashboard"
        subtitle="Monitor storage usage and retention policies"
      />

      {/* Overall Usage */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Storage Usage
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {storageStats.totalUsed.toFixed(1)} TB / {storageStats.totalCapacity} TB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usagePercentage.toFixed(1)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={usagePercentage}
                sx={{ height: 8, borderRadius: 1 }}
                color={usagePercentage > 80 ? 'error' : usagePercentage > 60 ? 'warning' : 'primary'}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Usage by Category */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<Database />}
            value={`${storageStats.telemetryUsage.toFixed(1)} TB`}
            label="Telemetry Data"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<Archive />}
            value={`${storageStats.mediaUsage.toFixed(1)} TB`}
            label="Media Files"
            color="info"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={<HardDrive />}
            value={`${storageStats.auditUsage.toFixed(1)} TB`}
            label="Audit Logs"
            color="success"
          />
        </Grid>
      </Grid>

      {/* Retention Policies */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Retention Policies
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Retention Period</TableCell>
                  <TableCell>Auto-Delete</TableCell>
                  <TableCell>Compression</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {retentionPolicies.map((policy) => (
                  <TableRow key={policy.category}>
                    <TableCell>{policy.category}</TableCell>
                    <TableCell>{policy.retention}</TableCell>
                    <TableCell>{policy.autoDelete ? '✓' : '—'}</TableCell>
                    <TableCell>{policy.compression ? '✓' : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Cleanup Schedule */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cleanup Schedule
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Last Run</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cleanupSchedule.map((schedule) => (
                  <TableRow key={schedule.task}>
                    <TableCell>{schedule.task}</TableCell>
                    <TableCell>{schedule.nextRun}</TableCell>
                    <TableCell>{schedule.lastRun}</TableCell>
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
