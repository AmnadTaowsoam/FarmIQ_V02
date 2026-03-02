import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { QrCode, Hash, Smartphone } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { apiClient } from '../../../api/client';

export const DeviceOnboardingPage: React.FC = () => {
  const [tenantId, setTenantId] = React.useState('');
  const [deviceType, setDeviceType] = React.useState('weighvision');
  const [claimCode, setClaimCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  const handleClaimDevice = async () => {
    const normalizedTenantId = tenantId.trim();
    const normalizedClaimCode = claimCode.trim();

    if (!normalizedTenantId) {
      setSubmitError('Tenant ID is required.');
      return;
    }

    if (normalizedClaimCode.length < 4) {
      setSubmitError('Claim code must be at least 4 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const response = await apiClient.post('/api/v1/devices', {
        tenantId: normalizedTenantId,
        deviceType,
        serialNo: normalizedClaimCode,
        status: 'active',
        metadata: {
          onboardingMethod: 'claim-code',
          claimCode: normalizedClaimCode,
        },
      });

      setSubmitSuccess(`Device claimed successfully (ID: ${response.data?.id || 'created'}).`);
      setClaimCode('');
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to claim device');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <AdminPageHeader title="Device Onboarding" subtitle="Enroll new devices into the FarmIQ platform" />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                {submitError && <Alert severity="error">{submitError}</Alert>}
                {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Tenant ID"
                      placeholder="t-001"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Device Type"
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                    >
                      <MenuItem value="weighvision">weighvision</MenuItem>
                      <MenuItem value="sensor-gateway">sensor-gateway</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                    }}
                  >
                    <QrCode size={24} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      QR Code Enrollment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scan device QR code to enroll
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 200,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={2} alignItems="center">
                    <Smartphone size={48} color="gray" />
                    <Typography variant="body2" color="text.secondary">
                      QR Scanner Coming Soon
                    </Typography>
                  </Stack>
                </Box>

                <Button variant="contained" fullWidth disabled>
                  Start QR Scan
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'success.light',
                      color: 'success.dark',
                    }}
                  >
                    <Hash size={24} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Claim Code Enrollment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter device claim code
                    </Typography>
                  </Box>
                </Stack>

                <TextField
                  fullWidth
                  label="Claim Code / Serial No"
                  placeholder="Enter claim code"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  helperText="This value will be saved as serialNo"
                />

                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Enter tenant ID and claim code, then press Claim Device to register a new device.
                  </Typography>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleClaimDevice}
                    disabled={submitting || !tenantId.trim() || claimCode.trim().length < 4}
                  >
                    {submitting ? 'Claiming...' : 'Claim Device'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Onboarding Instructions
              </Typography>
              <Stack spacing={2} component="ol" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2">
                  Ensure the device is powered on and connected to the network
                </Typography>
                <Typography component="li" variant="body2">
                  Fill in Tenant ID and device type
                </Typography>
                <Typography component="li" variant="body2">
                  Enter claim code and click Claim Device
                </Typography>
                <Typography component="li" variant="body2">
                  Verify device appears on the Devices page
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
