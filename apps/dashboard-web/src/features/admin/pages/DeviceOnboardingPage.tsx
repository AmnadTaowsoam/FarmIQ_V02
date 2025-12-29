import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, Button, TextField } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { QrCode, Hash, Smartphone } from 'lucide-react';

export const DeviceOnboardingPage: React.FC = () => {
  const [claimCode, setClaimCode] = React.useState('');

  const handleClaimDevice = () => {
    console.log('Claiming device with code:', claimCode);
    // TODO: Implement device claiming logic
  };

  return (
    <Box>
      <AdminPageHeader
        title="Device Onboarding"
        subtitle="Enroll new devices into the FarmIQ platform"
      />

      <Grid container spacing={3}>
        {/* QR Code Method */}
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

        {/* Claim Code Method */}
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
                  label="Claim Code"
                  placeholder="Enter 12-digit claim code"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  helperText="Format: XXXX-XXXX-XXXX"
                />

                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Device claim codes are provided with each device shipment. Enter the code to
                    register the device to your tenant.
                  </Typography>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleClaimDevice}
                    disabled={claimCode.length < 12}
                  >
                    Claim Device
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
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
                  Use either QR code scanning or claim code entry method
                </Typography>
                <Typography component="li" variant="body2">
                  Assign the device to a farm and barn after enrollment
                </Typography>
                <Typography component="li" variant="body2">
                  Configure device settings and verify connectivity
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
