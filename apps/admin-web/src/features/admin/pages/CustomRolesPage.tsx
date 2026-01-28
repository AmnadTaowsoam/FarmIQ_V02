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
  Chip,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  baseRoleId?: string;
  permissions: Array<{ permission: { name: string; category: string } }>;
}

export const CustomRolesPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    tenantId: '',
    baseRoleId: '',
    permissionIds: [] as string[],
  });

  const queryClient = useQueryClient();

  const { data: permissions } = useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/rbac/permissions');
      return response.data;
    },
  });

  const { data: customRoles, isLoading } = useQuery({
    queryKey: ['rbac', 'custom-roles', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return { data: [] };
      const response = await apiClient.get(`/api/v1/rbac/tenants/${selectedTenantId}/custom-roles`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/api/v1/rbac/custom-roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'custom-roles'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/rbac/custom-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'custom-roles'] });
    },
  });

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormValues({
      name: '',
      description: '',
      tenantId: selectedTenantId,
      baseRoleId: '',
      permissionIds: [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    createMutation.mutate(formValues);
  };

  const togglePermission = (permissionId: string) => {
    setFormValues({
      ...formValues,
      permissionIds: formValues.permissionIds.includes(permissionId)
        ? formValues.permissionIds.filter((id) => id !== permissionId)
        : [...formValues.permissionIds, permissionId],
    });
  };

  const roles = customRoles?.data || [];
  const permissionList = permissions?.data || [];
  const groupedPermissions = permissions?.data || {};

  return (
    <Box>
      <AdminPageHeader
        title="Custom Roles"
        subtitle="Create and manage tenant-specific custom roles"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus />}
            onClick={openCreateDialog}
            disabled={!selectedTenantId}
          >
            Create Custom Role
          </Button>
        }
      />

      <Stack spacing={2} sx={{ mt: 3 }}>
        <TextField
          label="Select Tenant"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          fullWidth
          required
          helperText="Select a tenant to view and manage custom roles"
        />

        {roles.map((role: CustomRole) => (
          <Card key={role.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="h6">{role.name}</Typography>
                  {role.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {role.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                    {role.permissions.map((rp) => (
                      <Chip
                        key={rp.permission.id}
                        label={rp.permission.name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Trash2 />}
                  onClick={() => deleteMutation.mutate(role.id)}
                >
                  Delete
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {roles.length === 0 && !isLoading && selectedTenantId && (
          <Typography color="text.secondary">No custom roles found for this tenant</Typography>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Custom Role</DialogTitle>
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
              label="Description"
              value={formValues.description}
              onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Tenant ID"
              value={formValues.tenantId}
              onChange={(e) => setFormValues({ ...formValues, tenantId: e.target.value })}
              fullWidth
              required
            />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Permissions
            </Typography>
            {Object.entries(groupedPermissions).map(([category, perms]: [string, any]) => (
              <Box key={category}>
                <Typography variant="caption" color="text.secondary">
                  {category.toUpperCase()}
                </Typography>
                <FormGroup>
                  {perms.map((perm: any) => (
                    <FormControlLabel
                      key={perm.name}
                      control={
                        <Checkbox
                          checked={formValues.permissionIds.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                      }
                      label={perm.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
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
