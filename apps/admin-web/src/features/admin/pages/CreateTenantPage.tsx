import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useCreateTenant } from '../../../api/admin/adminQueries';

export const CreateTenantPage: React.FC = () => {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    type: 'standard' as 'standard' | 'enterprise' | 'trial',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    region: 'TH',
  });

  const handleSubmit = async () => {
    const name = formValues.name.trim();
    if (!name) {
      setSubmitError('Tenant name is required.');
      return;
    }

    try {
      setSubmitError(null);
      await createTenant.mutateAsync({
        name,
        type: formValues.type,
        status: formValues.status,
        region: formValues.region.trim() || 'TH',
      });
      navigate('/tenants');
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to create tenant');
    }
  };

  return (
    <Box>
      <AdminPageHeader
        title="Create Tenant"
        subtitle="Register a new tenant organization"
        breadcrumbs={[
          { label: 'Tenants', path: '/tenants' },
          { label: 'Create' },
        ]}
      />

      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ maxWidth: 560 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Tenant Name"
              fullWidth
              value={formValues.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              label="Type"
              select
              fullWidth
              value={formValues.type}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  type: e.target.value as 'standard' | 'enterprise' | 'trial',
                }))
              }
            >
              <MenuItem value="standard">standard</MenuItem>
              <MenuItem value="enterprise">enterprise</MenuItem>
              <MenuItem value="trial">trial</MenuItem>
            </TextField>
            <TextField
              label="Status"
              select
              fullWidth
              value={formValues.status}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  status: e.target.value as 'active' | 'inactive' | 'suspended',
                }))
              }
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
              <MenuItem value="suspended">suspended</MenuItem>
            </TextField>
            <TextField
              label="Region"
              fullWidth
              value={formValues.region}
              onChange={(e) => setFormValues((prev) => ({ ...prev, region: e.target.value.toUpperCase() }))}
              helperText="Default: TH"
            />
            <Stack direction="row" spacing={1}>
              <Button type="button" variant="outlined" onClick={() => navigate('/tenants')}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleSubmit}
                disabled={!formValues.name.trim() || createTenant.isPending}
              >
                {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
