import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { ConfirmDialog } from '../../../components/admin/ConfirmDialog';
import { RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const SyncDashboardPage: React.FC = () => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Mock data
  const syncStats = {
    outboxPending: 1247,
    oldestPendingAge: 5400, // seconds
    lastSuccessAt: new Date(Date.now() - 2 * 60 * 1000),
    totalSynced: 45823,
    failedCount: 12,
  };

  const syncHistory = [
    { id: '1', triggeredBy: 'System', triggeredAt: new Date(Date.now() - 5 * 60 * 1000), status: 'success', recordsSynced: 234, duration: 12 },
    { id: '2', triggeredBy: 'admin@farmiq.com', triggeredAt: new Date(Date.now() - 30 * 60 * 1000), status: 'success', recordsSynced: 156, duration: 8 },
    { id: '3', triggeredBy: 'System', triggeredAt: new Date(Date.now() - 60 * 60 * 1000), status: 'failed', recordsSynced: 0, duration: 45, error: 'Connection timeout' },
    { id: '4', triggeredBy: 'System', triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), status: 'success', recordsSynced: 892, duration: 34 },
  ];

  const handleTriggerSync = (syncReason?: string) => {
    console.log('Triggering sync with reason:', syncReason);
    // TODO: Call API to trigger sync
    setConfirmOpen(false);
  };

  return (
    <Box>
      <AdminPageHeader
        title="Sync Dashboard"
        subtitle="Monitor and manage data synchronization"
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={() => setConfirmOpen(true)}
          >
            Trigger Sync
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Clock />}
            value={syncStats.outboxPending.toLocaleString()}
            label="Pending Records"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<AlertCircle />}
            value={`${Math.floor(syncStats.oldestPendingAge / 60)}m`}
            label="Oldest Pending"
            color="error"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<CheckCircle />}
            value={syncStats.totalSynced.toLocaleString()}
            label="Total Synced"
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<AlertCircle />}
            value={syncStats.failedCount.toString()}
            label="Failed"
            color="error"
          />
        </Grid>
      </Grid>

      {/* Alert */}
      {syncStats.oldestPendingAge > 3600 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Some records have been pending for over 1 hour. Consider triggering a manual sync.
        </Alert>
      )}

      {/* Last Sync */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Last Successful Sync
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDistanceToNow(syncStats.lastSuccessAt, { addSuffix: true })}
          </Typography>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sync History
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Triggered By</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Records</TableCell>
                  <TableCell align="right">Duration (s)</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {syncHistory.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell>{sync.triggeredBy}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(sync.triggeredAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sync.status.toUpperCase()}
                        color={sync.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{sync.recordsSynced.toLocaleString()}</TableCell>
                    <TableCell align="right">{sync.duration}</TableCell>
                    <TableCell>
                      {sync.error && (
                        <Typography variant="caption" color="error">
                          {sync.error}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Trigger Manual Sync"
        message="This will force synchronization of all pending records. This operation may take several minutes."
        confirmText="Trigger Sync"
        severity="warning"
        requireReason
        onConfirm={handleTriggerSync}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};
