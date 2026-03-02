import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrapApiResponse } from '../../../api';
import { Box, Typography } from '@mui/material';
import { Camera } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { StatusChip } from '../../../components/common/StatusChip';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useNavigate } from 'react-router-dom';
import type { components } from '@farmiq/api-client';

type Session = components['schemas']['WeighvisionSession'];
const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toWeighVisionDeviceIdFromStation(stationId: unknown): string | null {
    if (typeof stationId !== 'string' || stationId.trim().length === 0) return null;
    const m = stationId.trim().match(/^st-(\d+)$/i);
    if (!m) return null;
    const seq = Number(m[1]);
    if (!Number.isFinite(seq) || seq < 0) return null;
    return `wv-${String(Math.trunc(seq)).padStart(3, '0')}`;
}

function normalizeSession(item: any): Session {
    const sessionId = item?.session_id ?? item?.sessionId ?? item?.sessionID ?? item?.id;
    const stationId = item?.station_id ?? item?.stationId;
    const deviceId =
        item?.payload_json?.device_id ??
        item?.payloadJson?.device_id ??
        item?.payload?.device_id ??
        item?.payload?.deviceId ??
        item?.device_id ??
        item?.deviceId ??
        item?.device?.device_id ??
        item?.device?.deviceId ??
        toWeighVisionDeviceIdFromStation(stationId);
    const startAt = item?.start_at ?? item?.startAt ?? item?.ts ?? item?.createdAt;
    const imageCount =
        item?.image_count ??
        item?.imageCount ??
        (Array.isArray(item?.media) ? item.media.length : undefined);
    const latestMeasurementWeight = Array.isArray(item?.measurements) && item.measurements.length > 0
        ? (item.measurements[0]?.weightKg ?? item.measurements[0]?.weight_kg)
        : undefined;
    const finalWeightRaw =
        item?.final_weight_kg ??
        item?.finalWeightKg ??
        item?.weightKg ??
        latestMeasurementWeight;
    const finalWeightKg =
        typeof finalWeightRaw === 'number'
            ? finalWeightRaw
            : typeof finalWeightRaw === 'string'
                ? Number(finalWeightRaw)
                : null;

    return {
        ...(item as Session),
        session_id: sessionId as any,
        device_id: deviceId as any,
        start_at: startAt as any,
        image_count: (typeof imageCount === 'number' ? imageCount : 0) as any,
        final_weight_kg: (typeof finalWeightKg === 'number' && Number.isFinite(finalWeightKg) ? finalWeightKg : null) as any,
    };
}

const COLUMNS: any[] = [
    {
        id: 'session_id',
        label: 'Session ID',
        format: (v: string) => (
            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.7 }}>
                {typeof v === 'string' && v.length > 0 ? `${v.split('-')[0]}...` : '—'}
            </Typography>
        ),
    },
    {
        id: 'device_id',
        label: 'Device ID',
        format: (v: string) => (
            <Typography variant="body2" fontWeight="600">
                {typeof v === 'string' && v.length > 0 ? v : '—'}
            </Typography>
        ),
    },
    { id: 'start_at', label: 'Start Time', format: (v: string) => v ? new Date(v).toLocaleString() : '—' },
    { id: 'image_count', label: 'Images', align: 'right', format: (v: number) => <Typography variant="body2" fontWeight="700" color="primary">{Number.isFinite(v) ? v : 0}</Typography> },
    { id: 'final_weight_kg', label: 'Final Weight', align: 'right', format: (v: number) => <strong>{typeof v === 'number' ? `${v.toFixed(2)} kg` : '—'}</strong> },
    { 
        id: 'status', 
        label: 'Status',
        format: (v: string) => (
            <StatusChip
                status={v === 'completed' ? 'success' : v === 'active' ? 'info' : 'info'}
                label={typeof v === 'string' && v.length > 0 ? v.toUpperCase() : 'UNKNOWN'}
            />
        )
    },
];

export const SessionsListPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: loading, error } = useQuery<Session[]>({
      queryKey: ['sessions', tenantId, farmId, barnId, batchId, timeRange.start, timeRange.end],
      queryFn: async () => {
             if (!tenantId) return [];
             let resolvedFarmId = farmId || undefined;
             let resolvedBarnId = barnId || undefined;

             // WeighVision readmodel still uses short IDs like f-001 / b-001 in some datasets.
             // Resolve context UUIDs to short IDs for compatibility.
             if (resolvedFarmId && UUID_V4_LIKE.test(resolvedFarmId)) {
                 try {
                     const farmsResp = await api.farms.list({ tenantId, page: 1, pageSize: 200 });
                     const farms = unwrapApiResponse<any[]>(farmsResp) || [];
                     const selectedFarm = farms.find((f) => (f?.id || f?.farm_id) === resolvedFarmId);
                     const shortFarmId = selectedFarm?.name || selectedFarm?.farm_id;
                     if (typeof shortFarmId === 'string' && shortFarmId.length > 0 && !UUID_V4_LIKE.test(shortFarmId)) {
                         resolvedFarmId = shortFarmId;
                     }
                 } catch {
                     // Keep original filter if lookup fails.
                 }
             }

             if (resolvedBarnId && UUID_V4_LIKE.test(resolvedBarnId)) {
                 try {
                     const barnsResp = await api.barns.list({
                         tenantId,
                         farmId: farmId || undefined,
                         page: 1,
                         pageSize: 500,
                     });
                     const barns = unwrapApiResponse<any[]>(barnsResp) || [];
                     const selectedBarn = barns.find((b) => (b?.id || b?.barn_id) === resolvedBarnId);
                     const shortBarnId = selectedBarn?.name || selectedBarn?.barn_id;
                     if (typeof shortBarnId === 'string' && shortBarnId.length > 0 && !UUID_V4_LIKE.test(shortBarnId)) {
                         resolvedBarnId = shortBarnId;
                     }
                 } catch {
                     // Keep original filter if lookup fails.
                 }
             }

             const from = timeRange.start.toISOString();
             const to = timeRange.end.toISOString();
             
             const response = await api.weighvision.sessions({
                 tenantId,
                 farmId: resolvedFarmId,
                 barnId: resolvedBarnId,
                 batchId: batchId || undefined,
                 from,
                 to,
                 limit: 100,
             });
             
             // Handle response format: { items: Session[], nextCursor, hasMore }
             const data = unwrapApiResponse<any>(response);
             if (data?.items && Array.isArray(data.items)) {
                 return data.items.map(normalizeSession);
             }
             // Fallback: if response is direct array
             if (Array.isArray(data)) {
                 return data.map(normalizeSession);
             }
             return [];
      },
      enabled: !!tenantId,
      initialData: []
  });

  if (error) {
      return <ErrorState title="Failed to load sessions" message={error.message} />;
  }

  if (loading) {
      return (
          <Box>
              <PageHeader title="WeighVision Sessions" subtitle="Historical log of AI-powered weighing sessions and inference capture results" />
              <LoadingCard title="Loading sessions" lines={3} />
          </Box>
      );
  }

  if (!loading && sessions.length === 0) {
      return (
          <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader title="WeighVision Sessions" />
            <PremiumCard>
                <EmptyState 
                    icon={<Camera size={32} />}
                    title="No Sessions Found"
                    description="No scanning sessions are currently active for the selected context."
                    size="sm"
                />
            </PremiumCard>
          </Box>
      );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="WeighVision Sessions" 
        subtitle="Historical log of AI-powered weighing sessions and inference capture results" 
      />
      <PremiumCard noPadding>
        <BasicTable
          columns={COLUMNS}
          data={sessions}
          loading={loading}
          rowKey="session_id"
          onRowClick={(row) => navigate(`/weighvision/sessions/${row.session_id}`)}
        />
      </PremiumCard>
    </Box>
  );
};
