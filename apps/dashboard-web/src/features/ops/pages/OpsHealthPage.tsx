import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatCard } from '../../../components/ui/StatCard';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { apiClient, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type OpsSyncStatus = components['schemas']['OpsSyncStatusResponse']['data'];
type EdgeClusterSync = components['schemas']['EdgeClusterSync'];

export const OpsHealthPage: React.FC = () => {
  const { tenantId } = useActiveContext();
  const [data, setData] = useState<OpsSyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const response = await apiClient.get('/api/v1/ops/sync-status', {
          params: { tenantId },
        });
        setData((unwrapApiResponse<any>(response) as OpsSyncStatus) || null);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [tenantId]);

  if (error) return <ErrorState title="Failed to load ops health" message={error.message} />;
  if (loading && !data) {
    return (
      <Box>
        <PageHeader title="Ops Health" subtitle="Edge sync and ingestion health" />
        <LoadingCard title="Loading ops health" lines={4} />
      </Box>
    );
  }
  if (!loading && !data) {
    return (
      <Box>
        <PageHeader title="Ops Health" subtitle="Edge sync and ingestion health" />
        <EmptyState title="No ops health data yet" description="Connect edge clusters to surface health insights." />
      </Box>
    );
  }

  const clusters = data?.edge_clusters || [];
  const columns: Column<EdgeClusterSync>[] = [
    { id: 'cluster_id', label: 'Cluster ID' },
    { id: 'tenant_id', label: 'Tenant' },
    { id: 'status', label: 'Status' },
    { id: 'pending_events', label: 'Pending Events', align: 'right' },
    { id: 'sync_success_rate_24h', label: 'Success Rate 24h', align: 'right' },
    { id: 'last_sync', label: 'Last Sync', format: (val) => val ? new Date(val).toLocaleString() : '—' },
  ];

  return (
    <Box>
      <PageHeader title="Ops Health" subtitle="Edge sync and ingestion health" />
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={4}>
          <StatCard title="Ingestion Errors (24h)" value={data?.ingestion_errors_24h ?? '—'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="API Latency P95 (ms)" value={data?.api_latency_p95_ms ?? '—'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Clusters" value={clusters.length} />
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="Edge Cluster Sync">
            <BasicTable<EdgeClusterSync>
              columns={columns}
              data={clusters}
              loading={loading}
              emptyMessage="No edge clusters reported."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
