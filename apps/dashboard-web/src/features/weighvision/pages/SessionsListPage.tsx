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

const COLUMNS: any[] = [
    { id: 'session_id', label: 'Session ID', format: (v: string) => <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.7 }}>{v.split('-')[0]}...</Typography> },
    { id: 'barn_id', label: 'Barn', format: (v: string) => <Typography variant="body2" fontWeight="600">{v}</Typography> },
    { id: 'start_at', label: 'Start Time', format: (v: string) => v ? new Date(v).toLocaleString() : '—' },
    { id: 'image_count', label: 'Images', align: 'right', format: (v: number) => <Typography variant="body2" fontWeight="700" color="primary">{v}</Typography> },
    { id: 'final_weight_kg', label: 'Final Weight', align: 'right', format: (v: number) => <strong>{v ? `${v.toFixed(2)} kg` : '—'}</strong> },
    { 
        id: 'status', 
        label: 'Status',
        format: (v: string) => <StatusChip status={v === 'completed' ? 'success' : v === 'active' ? 'info' : 'info'} label={v?.toUpperCase()} />
    },
];

export const SessionsListPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: loading, error } = useQuery<Session[]>({
      queryKey: ['sessions', tenantId, farmId, barnId, batchId, timeRange.start, timeRange.end],
      queryFn: async () => {
             if (!tenantId) return [];
             const from = timeRange.start.toISOString();
             const to = timeRange.end.toISOString();
             
             const response = await api.weighvision.sessions({
                 tenantId,
                 farmId: farmId || undefined,
                 barnId: barnId || undefined,
                 batchId: batchId || undefined,
                 from,
                 to,
                 limit: 100,
             });
             
             // Handle response format: { items: Session[], nextCursor, hasMore }
             const data = unwrapApiResponse<any>(response);
             if (data?.items && Array.isArray(data.items)) {
                 return data.items as Session[];
             }
             // Fallback: if response is direct array
             if (Array.isArray(data)) {
                 return data as Session[];
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
