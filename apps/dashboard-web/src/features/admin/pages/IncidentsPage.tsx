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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const IncidentsPage: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  // Mock data
  const incidentStats = {
    open: 5,
    investigating: 3,
    resolved: 142,
    avgResolutionTime: '2.5 hours',
  };

  const incidents = [
    {
      id: '1',
      title: 'High sync queue depth',
      severity: 'P2',
      status: 'investigating',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      assignedTo: 'ops-team',
      affectedServices: ['sync-service'],
    },
    {
      id: '2',
      title: 'MQTT broker connection spike',
      severity: 'P3',
      status: 'open',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      assignedTo: 'platform-team',
      affectedServices: ['mqtt-broker'],
    },
    {
      id: '3',
      title: 'Storage capacity warning',
      severity: 'P2',
      status: 'open',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      assignedTo: 'ops-team',
      affectedServices: ['storage'],
    },
  ];

  const incidentTimeline = [
    { time: '10 minutes ago', event: 'Status changed to Investigating', user: 'admin@farmiq.com' },
    { time: '25 minutes ago', event: 'Assigned to ops-team', user: 'system' },
    { time: '30 minutes ago', event: 'Incident created', user: 'monitoring-system' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'P1':
        return 'error';
      case 'P2':
        return 'warning';
      case 'P3':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'investigating':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <AdminPageHeader
        title="Incident Management"
        subtitle="Track and manage system incidents"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
          >
            Create Incident
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<AlertCircle />}
            value={incidentStats.open.toString()}
            label="Open"
            color="error"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Clock />}
            value={incidentStats.investigating.toString()}
            label="Investigating"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<CheckCircle />}
            value={incidentStats.resolved.toString()}
            label="Resolved"
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            icon={<Clock />}
            value={incidentStats.avgResolutionTime}
            label="Avg Resolution Time"
            color="info"
          />
        </Grid>
      </Grid>

      {/* Incidents Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Active Incidents
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Affected Services</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedIncident(incident.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {incident.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={incident.severity}
                        color={getSeverityColor(incident.severity)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={incident.status.toUpperCase()}
                        color={getStatusColor(incident.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(incident.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>{incident.assignedTo}</TableCell>
                    <TableCell>
                      {incident.affectedServices.map((service) => (
                        <Chip key={service} label={service} size="small" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      {selectedIncident && (
        <Dialog
          open={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Incident Details</DialogTitle>
          <DialogContent>
            <Typography variant="h6" gutterBottom>
              High sync queue depth
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Timeline
                </Typography>
                <Stack spacing={2}>
                  {incidentTimeline.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        pl: 2,
                        borderLeft: '2px solid',
                        borderColor: 'primary.main',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {item.event}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.time} • {item.user}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedIncident(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Create Incident Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Incident</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth />
            <TextField label="Description" fullWidth multiline rows={3} />
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select label="Severity" defaultValue="P3">
                <MenuItem value="P1">P1 - Critical</MenuItem>
                <MenuItem value="P2">P2 - High</MenuItem>
                <MenuItem value="P3">P3 - Medium</MenuItem>
                <MenuItem value="P4">P4 - Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select label="Assign To" defaultValue="ops-team">
                <MenuItem value="ops-team">Ops Team</MenuItem>
                <MenuItem value="platform-team">Platform Team</MenuItem>
                <MenuItem value="support-team">Support Team</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setCreateOpen(false)}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
