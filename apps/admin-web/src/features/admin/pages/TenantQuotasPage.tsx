import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Typography,
  LinearProgress,
  Grid,
} from '@mui/material';
import { Pencil } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

interface TenantQuota {
  id: string;
  tenantId: string;
  maxDevices?: number;
  maxFarms?: number;
  maxBarns?: number;
  maxUsers?: number;
  maxStorageGb?: number;
  maxApiCallsPerDay?: number;
}

export const TenantQuotasPage: React.FC = () => {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    maxDevices: '',
    maxFarms: '',
    maxBarns: '',
    maxUsers: '',
    maxStorageGb: '',
    maxApiCallsPerDay: '',
  });

  const queryClient = useQueryClient();

  const { data: quota, isLoading } = useQuery({
    queryKey: ['quotas', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const response = await apiClient.get(`/api/v1/tenants/${selectedTenantId}/quota`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.patch(`/api/v1/tenants/${selectedTenantId}/quota`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas', selectedTenantId] });
      setDialogOpen(false);
    },
  });

  const openEditDialog = () => {
    if (quota) {
      setFormValues({
        maxDevices: quota.maxDevices?.toString() || '',
        maxFarms: quota.maxFarms?.toString() || '',
        maxBarns: quota.maxBarns?.toString() || '',
        maxUsers: quota.maxUsers?.toString() || '',
        maxStorageGb: quota.maxStorageGb?.toString() || '',
        maxApiCallsPerDay: quota.maxApiCallsPerDay?.toString() || '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload: any = {};
    if (formValues.maxDevices) payload.maxDevices = parseInt(formValues.maxDevices);
    if (formValues.maxFarms) payload.maxFarms = parseInt(formValues.maxFarms);
    if (formValues.maxBarns) payload.maxBarns = parseInt(formValues.maxBarns);
    if (formValues.maxUsers) payload.maxUsers = parseInt(formValues.maxUsers);
    if (formValues.maxStorageGb) payload.maxStorageGb = parseInt(formValues.maxStorageGb);
    if (formValues.maxApiCallsPerDay) payload.maxApiCallsPerDay = parseInt(formValues.maxApiCallsPerDay);

    updateMutation.mutate(payload);
  };

  return (
    <Box>
      <AdminPageHeader
        title="Tenant Quotas"
        subtitle="Manage resource quotas for tenants"
        action={
          <Button
            variant="contained"
            startIcon={<Pencil />}
            onClick={openEditDialog}
            disabled={!selectedTenantId || !quota}
          >
            Edit Quotas
          </Button>
        }
      />

      <Stack spacing={3} sx={{ mt: 3 }}>
        <TextField
          label="Select Tenant"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          fullWidth
          required
        />

        {quota && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quota Limits
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Devices
                  </Typography>
                  <Typography variant="h6">{quota.maxDevices || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Farms
                  </Typography>
                  <Typography variant="h6">{quota.maxFarms || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Barns
                  </Typography>
                  <Typography variant="h6">{quota.maxBarns || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Users
                  </Typography>
                  <Typography variant="h6">{quota.maxUsers || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max Storage (GB)
                  </Typography>
                  <Typography variant="h6">{quota.maxStorageGb || 'Unlimited'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Max API Calls/Day
                  </Typography>
                  <Typography variant="h6">{quota.maxApiCallsPerDay || 'Unlimited'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {!quota && selectedTenantId && !isLoading && (
          <Typography color="text.secondary">No quota configuration found for this tenant</Typography>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Tenant Quotas</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Max Devices"
              type="number"
              value={formValues.maxDevices}
              onChange={(e) => setFormValues({ ...formValues, maxDevices: e.target.value })}
              fullWidth
              helperText="Leave empty for unlimited"
            />
            <TextField
              label="Max Farms"
              type="number"
              value={formValues.maxFarms}
              onChange={(e) => setFormValues({ ...formValues, maxFarms: e.target.value })}
              fullWidth
            />
            <TextField
              label="Max Barns"
              type="number"
              value={formValues.maxBarns}
              onChange={(e) => setFormValues({ ...formValues, maxBarns: e.target.value })}
              fullWidth
            />
            <TextField
              label="Max Users"
              type="number"
              value={formValues.maxUsers}
              onChange={(e) => setFormValues({ ...formValues, maxUsers: e.target.value })}
              fullWidth
            />
            <TextField
              label="Max Storage (GB)"
              type="number"
              value={formValues.maxStorageGb}
              onChange={(e) => setFormValues({ ...formValues, maxStorageGb: e.target.value })}
              fullWidth
            />
            <TextField
              label="Max API Calls/Day"
              type="number"
              value={formValues.maxApiCallsPerDay}
              onChange={(e) => setFormValues({ ...formValues, maxApiCallsPerDay: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
