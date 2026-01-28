import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, TextField, Button, Alert } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Bug, Copy, RotateCcw } from 'lucide-react';

export const ContextDebugPage: React.FC = () => {
  const [overrides, setOverrides] = useState({
    tenantId: '',
    farmId: '',
    barnId: '',
  });

  const [activeOverride, setActiveOverride] = useState(false);

  const handleApplyOverride = () => {
    console.log('Applying context override:', overrides);
    setActiveOverride(true);
    // TODO: Implement override logic
  };

  const handleClearOverride = () => {
    setOverrides({ tenantId: '', farmId: '', barnId: '' });
    setActiveOverride(false);
  };

  const handleCopyContext = () => {
    const contextData = JSON.stringify(overrides, null, 2);
    navigator.clipboard.writeText(contextData);
  };

  return (
    <Box>
      <AdminPageHeader
        title="Context Debugging"
        subtitle="Override user context for testing and debugging"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {activeOverride && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Context override is active. The system is using the specified tenant/farm/barn
              instead of the user's actual context.
            </Alert>
          )}

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant="h6">
                  Developer Override
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manually set tenant, farm, and barn context for testing purposes. This bypasses
                  normal context selection and is useful for debugging multi-tenant scenarios.
                </Typography>

                <TextField
                  fullWidth
                  label="Tenant ID"
                  value={overrides.tenantId}
                  onChange={(e) => setOverrides({ ...overrides, tenantId: e.target.value })}
                  placeholder="Enter tenant ID or leave empty"
                  helperText="Override the current tenant context"
                />

                <TextField
                  fullWidth
                  label="Farm ID"
                  value={overrides.farmId}
                  onChange={(e) => setOverrides({ ...overrides, farmId: e.target.value })}
                  placeholder="Enter farm ID or leave empty"
                  helperText="Override the current farm context"
                />

                <TextField
                  fullWidth
                  label="Barn ID"
                  value={overrides.barnId}
                  onChange={(e) => setOverrides({ ...overrides, barnId: e.target.value })}
                  placeholder="Enter barn ID or leave empty"
                  helperText="Override the current barn context"
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Bug size={18} />}
                    onClick={handleApplyOverride}
                  >
                    Apply Override
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<RotateCcw size={18} />}
                    onClick={handleClearOverride}
                    disabled={!activeOverride}
                  >
                    Clear Override
                  </Button>
                </Stack>

                <Button
                  variant="text"
                  startIcon={<Copy size={18} />}
                  onClick={handleCopyContext}
                >
                  Copy Context JSON
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Current Context Display */}
          <Card sx={{ mt: 3 }} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Context
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tenant ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {overrides.tenantId || 'Not set'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Farm ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {overrides.farmId || 'Not set'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Barn ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {overrides.barnId || 'Not set'}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Notes
              </Typography>
              <Stack spacing={2} component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2">
                  Context overrides persist until cleared
                </Typography>
                <Typography component="li" variant="body2">
                  Leave fields empty to use user's actual context
                </Typography>
                <Typography component="li" variant="body2">
                  Useful for testing multi-tenant scenarios
                </Typography>
                <Typography component="li" variant="body2">
                  Only available to platform administrators
                </Typography>
                <Typography component="li" variant="body2">
                  Override state is stored in browser session
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Presets
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() =>
                    setOverrides({
                      tenantId: 'tenant-001',
                      farmId: 'farm-001',
                      barnId: 'barn-001',
                    })
                  }
                >
                  Acme Farms - Farm A
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() =>
                    setOverrides({
                      tenantId: 'tenant-002',
                      farmId: 'farm-003',
                      barnId: '',
                    })
                  }
                >
                  Green Valley - Farm C
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
