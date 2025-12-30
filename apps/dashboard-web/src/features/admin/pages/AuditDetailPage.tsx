import React from 'react';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useAuditEntry } from '../../../api/admin/adminQueries';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../../../components/EmptyState';

export const AuditDetailPage: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const { tenantId } = useActiveContext();
  const { data: entry, isLoading, error } = useAuditEntry(auditId || '', { tenantId: tenantId || undefined });

  if (!tenantId) {
    return (
      <Box>
        <AdminPageHeader title="Audit Entry" />
        <EmptyState title="Select a tenant" description="Choose a tenant to view audit entry details." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <AdminPageHeader title="Audit Entry" />
        <Card>
          <CardContent>
            <Typography color="error">Failed to load audit entry</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading || !entry) {
    return (
      <Box>
        <AdminPageHeader title="Audit Entry" />
        <Card>
          <CardContent>
            <Typography>Loading audit entry...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <AdminPageHeader
        title="Audit Entry"
        subtitle={entry.action}
        breadcrumbs={[
          { label: 'Audit Log', path: '/admin/audit-log' },
          { label: entry.id },
        ]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Entry ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {entry.id}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {entry.userName}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Last Seen
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Action
                  </Typography>
                  <StatusPill label={entry.action} color="primary" size="small" />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Resource
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {entry.resource}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <StatusPill
                    label={entry.status.toUpperCase()}
                    color={entry.status === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    IP Address
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {entry.ipAddress}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(entry.details || {}, null, 2)}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
