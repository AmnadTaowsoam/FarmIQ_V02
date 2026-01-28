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
  Switch,
  FormControlLabel,
  Alert,
  Chip,
} from '@mui/material';
import { Plus, Key } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

interface ScimConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  createdAt: string;
}

export const ScimConfigurationPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    tenantId: '',
    bearerToken: '',
    enabled: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['scim', 'configs'],
    queryFn: async () => {
      // This would need to fetch all tenant SCIM configs
      // For now, we'll use a placeholder
      return { data: [] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/api/v1/admin/scim/config', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scim', 'configs'] });
      setDialogOpen(false);
    },
  });

  const openCreateDialog = () => {
    setFormValues({
      tenantId: '',
      bearerToken: '',
      enabled: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    createMutation.mutate(formValues);
  };

  const configs = data?.data || [];

  return (
    <Box>
      <AdminPageHeader
        title="SCIM Configuration"
        subtitle="Manage SCIM 2.0 provisioning for tenants"
        action={
          <Button variant="contained" startIcon={<Plus />} onClick={openCreateDialog}>
            Add SCIM Config
          </Button>
        }
      />

      <Stack spacing={3} sx={{ mt: 3 }}>
        {configs.map((config: ScimConfig) => (
          <Card key={config.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Tenant: {config.tenantId}</Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <StatusPill
                      label={config.enabled ? 'Enabled' : 'Disabled'}
                      color={config.enabled ? 'success' : 'error'}
                    />
                    <Chip icon={<Key />} label="Bearer Token Configured" size="small" />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && !isLoading && (
          <Alert severity="info">No SCIM configurations found</Alert>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add SCIM Configuration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tenant ID"
              value={formValues.tenantId}
              onChange={(e) => setFormValues({ ...formValues, tenantId: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Bearer Token"
              value={formValues.bearerToken}
              onChange={(e) => setFormValues({ ...formValues, bearerToken: e.target.value })}
              fullWidth
              required
              type="password"
              helperText="SCIM bearer token for authentication"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formValues.enabled}
                  onChange={(e) => setFormValues({ ...formValues, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
