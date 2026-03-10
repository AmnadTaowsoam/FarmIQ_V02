import React, { useMemo, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api, isApiError, getCorrelationId, unwrapApiResponse } from '../../../api';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { Link2 } from 'lucide-react';

export const SensorBindingsPage: React.FC = () => {
  const { tenantId, farmId, barnId } = useActiveContext();
  const [sensorId, setSensorId] = useState('');
  const [bindings, setBindings] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [protocol, setProtocol] = useState('mqtt');
  const [channel, setChannel] = useState('');
  const [samplingRate, setSamplingRate] = useState('60');
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const canSearch = useMemo(() => !!tenantId && !!sensorId.trim(), [tenantId, sensorId]);
  const canCreate = useMemo(
    () => !!tenantId && !!sensorId.trim() && !!selectedDeviceId && !!protocol,
    [tenantId, sensorId, selectedDeviceId, protocol]
  );

  const fetchDevices = async () => {
    if (!tenantId) return;
    try {
      const response = await api.devices.list({
        tenantId,
        farmId: farmId || undefined,
        barnId: barnId || undefined,
        page: 1,
        pageSize: 200,
      });
      const raw = unwrapApiResponse<any>(response);
      const list = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray(raw.items)
          ? raw.items
          : [];
      const normalized = list.map((d: any) => ({
        id: d.id,
        serialNo: d.serialNo || d.serial_no || d.device_id || d.deviceId || d.id,
      }));
      setDevices(normalized);
      if (!selectedDeviceId && normalized.length > 0) {
        setSelectedDeviceId(normalized[0].id);
      }
    } catch {
      setDevices([]);
    }
  };

  const fetchBindings = async () => {
    if (!tenantId || !sensorId.trim()) return;
    setLoading(true);
    try {
      const response = await api.sensors.bindings.list(sensorId.trim(), { page: 1, pageSize: 100 });
      const raw = unwrapApiResponse<any>(response);
      const bindingsResponse = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray(raw.items)
          ? raw.items
          : [];

      const normalized = bindingsResponse.map((binding: any) => ({
        ...binding,
        device_id: binding.device_id || (binding as any).deviceId,
        sensor_id: binding.sensor_id || (binding as any).sensorId,
        sampling_rate: binding.sampling_rate ?? (binding as any).samplingRate,
        effective_from: binding.effective_from || (binding as any).effectiveFrom,
        effective_to: binding.effective_to || (binding as any).effectiveTo,
      }));
      setBindings(normalized);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createBinding = async () => {
    if (!canCreate || !tenantId) return;
    setLoading(true);
    setCreateMessage(null);
    try {
      await api.sensors.bindings.create(sensorId.trim(), {
        tenantId,
        deviceId: selectedDeviceId,
        protocol,
        channel: channel.trim() || undefined,
        samplingRate: Number.isFinite(Number(samplingRate)) ? Number(samplingRate) : undefined,
        effectiveFrom: new Date().toISOString(),
      } as any);
      setCreateMessage('Binding created');
      await fetchBindings();
    } catch (err: any) {
      setCreateMessage(err?.message || 'Failed to create binding');
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, farmId, barnId]);

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Sensor Bindings"
        subtitle="Inspect sensor to device bindings"
        actions={[
          {
            label: 'Load Bindings',
            variant: 'contained',
            startIcon: <Link2 size={18} />,
            onClick: fetchBindings,
            disabled: !canSearch,
          },
        ]}
      />

      <PremiumCard sx={{ mb: 3 }}>
        <TextField
          label="Sensor ID"
          value={sensorId}
          onChange={(event) => setSensorId(event.target.value)}
          fullWidth
        />
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={fetchBindings} disabled={!canSearch}>
            Search
          </Button>
        </Box>
      </PremiumCard>

      <PremiumCard sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Create Binding
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Device</InputLabel>
            <Select
              label="Device"
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(String(event.target.value))}
            >
              {devices.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.serialNo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Protocol</InputLabel>
            <Select label="Protocol" value={protocol} onChange={(event) => setProtocol(String(event.target.value))}>
              <MenuItem value="mqtt">mqtt</MenuItem>
              <MenuItem value="modbus">modbus</MenuItem>
              <MenuItem value="opcua">opcua</MenuItem>
              <MenuItem value="http">http</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Channel (optional)"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          />
          <TextField
            size="small"
            label="Sampling Rate (sec)"
            value={samplingRate}
            onChange={(event) => setSamplingRate(event.target.value)}
          />
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="contained" onClick={createBinding} disabled={!canCreate || loading}>
            Create Binding
          </Button>
          {createMessage ? (
            <Typography variant="body2" color={createMessage === 'Binding created' ? 'success.main' : 'error.main'}>
              {createMessage}
            </Typography>
          ) : null}
        </Box>
      </PremiumCard>

      {loading ? (
        <LoadingCard title="Loading bindings" lines={3} />
      ) : error ? (
        isApiError(error) ? (
          <ApiErrorState
            status={error.response?.status}
            message={error.message}
            correlationId={getCorrelationId(error)}
            endpoint={`/api/v1/sensors/${sensorId.trim()}/bindings`}
            onRetry={fetchBindings}
          />
        ) : (
          <ErrorState title="Failed to load bindings" message={(error as Error).message} />
        )
      ) : bindings.length === 0 ? (
        <EmptyState
          icon={<Link2 size={32} />}
          title="No bindings found"
          description="Enter a sensor ID to view device bindings."
        />
      ) : (
        <PremiumCard noPadding>
          <BasicTable<any>
            columns={[
              { id: 'device_id', label: 'Device ID' },
              { id: 'protocol', label: 'Protocol' },
              { id: 'channel', label: 'Channel' },
              { id: 'sampling_rate', label: 'Sampling Rate' },
              {
                id: 'effective_from',
                label: 'Effective From',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
              {
                id: 'effective_to',
                label: 'Effective To',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
            ]}
            data={bindings}
            rowKey="id"
          />
        </PremiumCard>
      )}
    </Box>
  );
};
