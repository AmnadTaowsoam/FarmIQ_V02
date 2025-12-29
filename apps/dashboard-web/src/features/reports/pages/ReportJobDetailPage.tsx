import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { reportsApi } from '../api/reportsApi';
import { getCorrelationId, isApiError, unwrapApiResponse } from '../../../api';
import { useToast } from '../../../components/toast/useToast';
import { useActiveContext } from '../../../contexts/ActiveContext';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{value}</Box>
  </Box>
);

export const ReportJobDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const { tenantId } = useActiveContext();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', 'job', tenantId, jobId],
    queryFn: async () => {
      if (!tenantId || !jobId) return null;
      const response = await reportsApi.getJob(tenantId, jobId);
      return unwrapApiResponse<any>(response);
    },
    enabled: !!tenantId && !!jobId,
    refetchInterval: (current) => {
      const status = String(current?.status || '').toLowerCase();
      return status === 'queued' || status === 'running' ? 4000 : false;
    },
  });

  const handleDownload = async () => {
    if (!tenantId || !jobId) return;
    try {
      const response = await reportsApi.download(tenantId, jobId);
      const payload = unwrapApiResponse<any>(response);
      if (payload?.download_url) {
        window.location.href = payload.download_url;
      } else {
        window.location.href = `/api/v1/reports/jobs/${jobId}/download?tenantId=${encodeURIComponent(tenantId)}`;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Download failed');
    }
  };

  if (!jobId) {
    return (
      <Box>
        <PageHeader title="Report Job" subtitle="Track a single report export" />
        <EmptyState
          title="Missing job ID"
          description="Select a report job from the list to view details."
          actionLabel="Back to Jobs"
          onAction={() => navigate('/reports/jobs')}
        />
      </Box>
    );
  }

  if (error) {
    if (isApiError(error)) {
      return (
        <ApiErrorState
          status={error.response?.status}
          message={error.message}
          correlationId={getCorrelationId(error)}
          endpoint={`/api/v1/reports/jobs/${jobId}`}
          onRetry={refetch}
        />
      );
    }
    return <ErrorState title="Failed to load report job" message={(error as Error).message} />;
  }

  if (isLoading && !data) {
    return (
      <Box>
        <PageHeader title="Report Job" subtitle="Loading report job details" />
        <LoadingCard title="Loading report job..." lines={5} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <PageHeader title="Report Job" subtitle="Track a single report export" />
        <EmptyState
          title="Report job not found"
          description="This job could not be found in the current tenant scope."
          actionLabel="Back to Jobs"
          onAction={() => navigate('/reports/jobs')}
        />
      </Box>
    );
  }

  const statusValue = String(data.status || '').toLowerCase();
  const ready = statusValue === 'succeeded' || statusValue === 'completed';

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Report Job"
        subtitle="Monitor export progress and download completed files"
        breadcrumbs={[
          { label: 'Reports', href: '/reports' },
          { label: 'Jobs', href: '/reports/jobs' },
          { label: data.id },
        ]}
        primaryAction={
          ready
            ? {
                label: 'Download',
                onClick: handleDownload,
                startIcon: <Download size={18} />,
                variant: 'contained',
              }
            : undefined
        }
        secondaryActions={[
          {
            label: 'Refresh',
            onClick: () => refetch(),
            startIcon: <RefreshCw size={18} />,
            variant: 'outlined',
          },
        ]}
      />

      <PremiumCard sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          <DetailItem
            label="Status"
            value={
              <StatusChip
                status={ready ? 'success' : statusValue === 'failed' ? 'error' : statusValue === 'running' ? 'info' : 'warning'}
                label={String(data.status || 'unknown').toUpperCase()}
              />
            }
          />
          <DetailItem label="Type" value={<Typography fontWeight={600}>{String(data.job_type || '').replace(/_/g, ' ')}</Typography>} />
          <DetailItem label="Format" value={<Typography fontWeight={600}>{String(data.format || '').toUpperCase()}</Typography>} />
          <DetailItem
            label="Created"
            value={<Typography fontWeight={600}>{data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</Typography>}
          />
          <DetailItem
            label="Started"
            value={<Typography fontWeight={600}>{data.started_at ? new Date(data.started_at).toLocaleString() : '—'}</Typography>}
          />
          <DetailItem
            label="Finished"
            value={<Typography fontWeight={600}>{data.finished_at ? new Date(data.finished_at).toLocaleString() : '—'}</Typography>}
          />
        </Box>
      </PremiumCard>

      {data.error_message ? (
        <PremiumCard>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Error details
          </Typography>
          <Typography variant="body2">{data.error_message}</Typography>
        </PremiumCard>
      ) : null}
    </Box>
  );
};
