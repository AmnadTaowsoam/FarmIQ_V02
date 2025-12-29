import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Edit, ArrowLeft } from 'lucide-react';
import { api, unwrapApiResponse } from '../../../api';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { SensorBindingsTab } from '../components/SensorBindingsTab';
import { SensorCalibrationsTab } from '../components/SensorCalibrationsTab';
import { useActiveContext } from '../../../contexts/ActiveContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sensor-tabpanel-${index}`}
      aria-labelledby={`sensor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const SensorDetailPage: React.FC = () => {
  const { sensorId } = useParams<{ sensorId: string }>();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const { tenantId } = useActiveContext();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sensor', sensorId],
    queryFn: async () => {
      if (!sensorId) throw new Error('Sensor ID is required');
      if (!tenantId) throw new Error('Tenant is required');
      const response = await api.sensors.get(sensorId);
      return unwrapApiResponse<any>(response);
    },
    enabled: !!sensorId && !!tenantId,
  });

  if (error) {
    return (
      <Box>
        <PageHeader title="Sensor Details" />
        <ErrorState title="Failed to load sensor" message={(error as Error).message} onRetry={() => refetch()} />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Sensor Details" />
        <LoadingCard />
      </Box>
    );
  }

  const sensor = data;

  if (!sensor) {
    return (
      <Box>
        <PageHeader title="Sensor Details" />
        <Typography>Sensor not found</Typography>
      </Box>
    );
  }

  const normalized = {
    ...sensor,
    sensor_id: (sensor as any).sensor_id || (sensor as any).sensorId,
    barn_id: (sensor as any).barn_id || (sensor as any).barnId,
    last_calibration_at:
      (sensor as any).last_calibration_at || (sensor as any).lastCalibrationAt,
  };

  return (
    <Box>
      <PageHeader
        title={normalized.label || normalized.sensor_id || 'Sensor'}
        subtitle={`Sensor ID: ${normalized.sensor_id}`}
        action={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft size={18} />}
              onClick={() => navigate('/sensors')}
            >
              Back to List
            </Button>
            <Button
              variant="contained"
              startIcon={<Edit size={18} />}
              onClick={() => navigate(`/sensors/${sensorId}/edit`)}
            >
              Edit
            </Button>
          </Box>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Chip
              label={normalized.enabled ? 'Enabled' : 'Disabled'}
              color={normalized.enabled ? 'success' : 'default'}
            />
            <Chip label={normalized.type} variant="outlined" />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Type</Typography>
              <Typography variant="body1">{normalized.type}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Unit</Typography>
              <Typography variant="body1">{normalized.unit}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Barn</Typography>
              <Typography variant="body1">{normalized.barn_id || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Zone</Typography>
              <Typography variant="body1">{normalized.zone || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Last Calibration</Typography>
              <Typography variant="body1">
                {normalized.last_calibration_at
                  ? new Date(normalized.last_calibration_at).toLocaleString()
                  : 'Never'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {new Date(sensor.created_at).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="Bindings" />
            <Tab label="Calibrations" />
            <Tab label="Thresholds" disabled />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={currentTab} index={0}>
            <SensorBindingsTab sensorId={sensorId!} />
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <SensorCalibrationsTab sensorId={sensorId!} />
          </TabPanel>
          <TabPanel value={currentTab} index={2}>
            <Typography color="text.secondary">Thresholds configuration coming soon...</Typography>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SensorDetailPage;
