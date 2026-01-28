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
  MenuItem,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

interface IdentityProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc';
  enabled: boolean;
  tenantId?: string;
  jitEnabled: boolean;
  createdAt: string;
}

export const SsoConfigurationPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdp, setEditingIdp] = useState<IdentityProvider | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    type: 'oidc' as 'saml' | 'oidc',
    tenantId: '',
    enabled: true,
    jitEnabled: true,
    defaultRoleId: '',
    metadata: '',
    config: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sso', 'identity-providers'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/sso/identity-providers');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/api/v1/sso/identity-providers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'identity-providers'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/api/v1/sso/identity-providers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'identity-providers'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/sso/identity-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso', 'identity-providers'] });
    },
  });

  const openCreateDialog = () => {
    setEditingIdp(null);
    setFormValues({
      name: '',
      type: 'oidc',
      tenantId: '',
      enabled: true,
      jitEnabled: true,
      defaultRoleId: '',
      metadata: '',
      config: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (idp: IdentityProvider) => {
    setEditingIdp(idp);
    setFormValues({
      name: idp.name,
      type: idp.type,
      tenantId: idp.tenantId || '',
      enabled: idp.enabled,
      jitEnabled: idp.jitEnabled,
      defaultRoleId: '',
      metadata: '',
      config: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    try {
      const payload = {
        name: formValues.name,
        type: formValues.type,
        tenantId: formValues.tenantId || null,
        enabled: formValues.enabled,
        jitEnabled: formValues.jitEnabled,
        defaultRoleId: formValues.defaultRoleId || null,
        metadata: JSON.parse(formValues.metadata || '{}'),
        config: JSON.parse(formValues.config || '{}'),
      };

      if (editingIdp) {
        updateMutation.mutate({ id: editingIdp.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      console.error('Invalid JSON in metadata or config', error);
    }
  };

  const identityProviders = data?.data || [];

  return (
    <Box>
      <AdminPageHeader
        title="SSO Configuration"
        subtitle="Manage identity providers for Single Sign-On"
        action={
          <Button variant="contained" startIcon={<Plus />} onClick={openCreateDialog}>
            Add Identity Provider
          </Button>
        }
      />

      <Stack spacing={3} sx={{ mt: 3 }}>
        {identityProviders.map((idp: IdentityProvider) => (
          <Card key={idp.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{idp.name}</Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <StatusPill
                      label={idp.type.toUpperCase()}
                      color="primary"
                    />
                    <StatusPill
                      label={idp.enabled ? 'Enabled' : 'Disabled'}
                      color={idp.enabled ? 'success' : 'error'}
                    />
                    {idp.jitEnabled && (
                      <StatusPill label="JIT Enabled" color="info" />
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<Pencil />}
                    onClick={() => openEditDialog(idp)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 />}
                    onClick={() => deleteMutation.mutate(idp.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {identityProviders.length === 0 && !isLoading && (
          <Alert severity="info">No identity providers configured</Alert>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIdp ? 'Edit Identity Provider' : 'Add Identity Provider'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={formValues.name}
              onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Type"
              select
              value={formValues.type}
              onChange={(e) => setFormValues({ ...formValues, type: e.target.value as 'saml' | 'oidc' })}
              fullWidth
              required
            >
              <MenuItem value="oidc">OIDC</MenuItem>
              <MenuItem value="saml">SAML 2.0</MenuItem>
            </TextField>
            <TextField
              label="Tenant ID (optional)"
              value={formValues.tenantId}
              onChange={(e) => setFormValues({ ...formValues, tenantId: e.target.value })}
              fullWidth
              helperText="Leave empty for platform-wide IdP"
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
            <FormControlLabel
              control={
                <Switch
                  checked={formValues.jitEnabled}
                  onChange={(e) => setFormValues({ ...formValues, jitEnabled: e.target.checked })}
                />
              }
              label="Just-In-Time Provisioning"
            />
            <TextField
              label="Metadata (JSON)"
              value={formValues.metadata}
              onChange={(e) => setFormValues({ ...formValues, metadata: e.target.value })}
              fullWidth
              multiline
              rows={4}
              helperText="IdP metadata in JSON format"
            />
            <TextField
              label="Config (JSON)"
              value={formValues.config}
              onChange={(e) => setFormValues({ ...formValues, config: e.target.value })}
              fullWidth
              multiline
              rows={4}
              helperText="Provider-specific configuration (clientId, clientSecret, etc.)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingIdp ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
