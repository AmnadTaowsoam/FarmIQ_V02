import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, TextField, Button, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Divider } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Save, RotateCcw } from 'lucide-react';

export const DataPolicyPage: React.FC = () => {
  const [retentionDays, setRetentionDays] = useState({
    telemetry: 90,
    audit: 365,
    sessions: 30,
    alerts: 180,
  });

  const [autoDelete, setAutoDelete] = useState(true);
  const [compressionEnabled, setCompressionEnabled] = useState(true);

  const handleSave = () => {
    console.log('Saving data policy:', { retentionDays, autoDelete, compressionEnabled });
    // TODO: Implement save logic
  };

  const handleReset = () => {
    setRetentionDays({ telemetry: 90, audit: 365, sessions: 30, alerts: 180 });
    setAutoDelete(true);
    setCompressionEnabled(true);
  };

  return (
    <Box>
      <AdminPageHeader
        title="Data Retention Policy"
        subtitle="Configure data retention and deletion policies"
        actions={
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RotateCcw size={18} />}
              onClick={handleReset}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="contained"
              startIcon={<Save size={18} />}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {/* Retention Periods */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Retention Periods
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure how long different types of data are retained before automatic deletion.
              </Typography>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Telemetry Data"
                  type="number"
                  value={retentionDays.telemetry}
                  onChange={(e) =>
                    setRetentionDays({ ...retentionDays, telemetry: parseInt(e.target.value) })
                  }
                  InputProps={{ endAdornment: 'days' }}
                  helperText="Device telemetry and sensor readings"
                />

                <TextField
                  fullWidth
                  label="Audit Logs"
                  type="number"
                  value={retentionDays.audit}
                  onChange={(e) =>
                    setRetentionDays({ ...retentionDays, audit: parseInt(e.target.value) })
                  }
                  InputProps={{ endAdornment: 'days' }}
                  helperText="User actions and system events"
                />

                <TextField
                  fullWidth
                  label="WeighVision Sessions"
                  type="number"
                  value={retentionDays.sessions}
                  onChange={(e) =>
                    setRetentionDays({ ...retentionDays, sessions: parseInt(e.target.value) })
                  }
                  InputProps={{ endAdornment: 'days' }}
                  helperText="Weighing session data and images"
                />

                <TextField
                  fullWidth
                  label="Alerts & Notifications"
                  type="number"
                  value={retentionDays.alerts}
                  onChange={(e) =>
                    setRetentionDays({ ...retentionDays, alerts: parseInt(e.target.value) })
                  }
                  InputProps={{ endAdornment: 'days' }}
                  helperText="System alerts and user notifications"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management Options */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure automatic data management and optimization settings.
              </Typography>

              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoDelete}
                      onChange={(e) => setAutoDelete(e.target.checked)}
                    />
                  }
                  label="Automatic Deletion"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -2 }}>
                  Automatically delete data older than retention period
                </Typography>

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={compressionEnabled}
                      onChange={(e) => setCompressionEnabled(e.target.checked)}
                    />
                  }
                  label="Data Compression"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -2 }}>
                  Compress old data to save storage space
                </Typography>

                <Divider />

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Backup Policy
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select defaultValue="daily" label="Backup Frequency">
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Archive Location
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Storage Tier</InputLabel>
                    <Select defaultValue="standard" label="Storage Tier">
                      <MenuItem value="hot">Hot Storage (Fast Access)</MenuItem>
                      <MenuItem value="standard">Standard Storage</MenuItem>
                      <MenuItem value="cold">Cold Storage (Archive)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Privacy & Compliance */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Privacy & Compliance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data retention policies must comply with local regulations (PDPA, GDPR). Consult
                with legal team before modifying retention periods for audit logs and personal data.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
