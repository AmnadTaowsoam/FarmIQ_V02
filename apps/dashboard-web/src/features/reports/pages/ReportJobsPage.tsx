import React, { useMemo, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, RefreshCw, Download } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useCreateReportJob, useReportJobs } from '../hooks/useReports';
import { reportsApi } from '../api/reportsApi';
import { getCorrelationId, isApiError, unwrapApiResponse } from '../../../api';
import { useToast } from '../../../components/toast/useToast';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'FEED_INTAKE_EXPORT', label: 'Feed Intake Export' },
];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

export const ReportJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [status, setStatus] = useState('');
  const [jobType, setJobType] = useState('');
  const [startDate, setStartDate] = useState(formatDateInput(timeRange.start));
  const [endDate, setEndDate] = useState(formatDateInput(timeRange.end));
  const [filtersApplied, setFiltersApplied] = useState(0);
  const createMutation = useCreateReportJob();
  const isDebugTools = import.meta.env.VITE_DEBUG_TOOLS === '1';

  const params = useMemo(
    () => ({
      status: status || undefined,
      job_type: jobType || undefined,
      created_from: startDate || undefined,
      created_to: endDate || undefined,
      limit: 50,
      refresh: filtersApplied,
    }),
    [status, jobType, startDate, endDate, filtersApplied]
  );

  const { data, isLoading, error, refetch } = useReportJobs(tenantId, params);

  const handleSmokeJob = async () => {
    if (!tenantId) {
      toast.error('Select a tenant before creating a report job.');
      return;
    }
    if (createMutation.isPending) return;
    try {
      const job = await createMutation.mutateAsync({
        tenantId,
        job_type: 'FEED_INTAKE_EXPORT',
        format: 'csv',
        farm_id: farmId || undefined,
        barn_id: barnId || undefined,
        batch_id: batchId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      toast.success('Demo report job created');
      if (job?.id) {
        navigate(`/reports/jobs/${job.id}`);
      } else {
        navigate('/reports/jobs');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create demo report job');
    }
  };

  const handleDownload = async (jobId: string) => {
    if (!tenantId) {
      toast.error('Select a tenant before downloading a report.');
      return;
    }
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

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'Job ID', flex: 1, minWidth: 220 },
    {
      field: 'job_type',
      headerName: 'Type',
      flex: 1,
      minWidth: 160,
      valueFormatter: (value) => String(value || '').replace(/_/g, ' '),
    },
    { field: 'status', headerName: 'Status', width: 140 },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 170,
      valueFormatter: (value) => (value ? new Date(String(value)).toLocaleString() : '—'),
    },
    {
      field: 'started_at',
      headerName: 'Started',
      width: 170,
      valueFormatter: (value) => (value ? new Date(String(value)).toLocaleString() : '—'),
    },
    {
      field: 'finished_at',
      headerName: 'Finished',
      width: 170,
      valueFormatter: (value) => (value ? new Date(String(value)).toLocaleString() : '—'),
    },
    {
      field: 'error_message',
      headerName: 'Error',
      width: 220,
      valueFormatter: (value) => value || '—',
    },
    {
      field: 'download',
      headerName: 'Download',
      width: 140,
      sortable: false,
      renderCell: (params) => {
        const statusValue = String(params.row.status || '').toLowerCase();
        const ready = statusValue === 'succeeded' || statusValue === 'completed';
        return (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={!ready}
            onClick={(event) => {
              event.stopPropagation();
              handleDownload(params.row.id);
            }}
          >
            Download
          </Button>
        );
      },
    },
  ];

  if (error) {
    if (isApiError(error)) {
      return (
        <ApiErrorState
          status={error.response?.status}
          message={error.message}
          correlationId={getCorrelationId(error)}
          endpoint="/api/v1/reports/jobs"
          onRetry={refetch}
        />
      );
    }
    return <ErrorState title="Failed to load report jobs" message={(error as Error).message} />;
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Report Jobs"
        subtitle="Track active exports and download completed results"
        primaryAction={{
          label: 'Create Export',
          onClick: () => navigate('/reports/jobs/new'),
          startIcon: <PlusCircle size={18} />,
          variant: 'contained',
        }}
        secondaryActions={[
          ...(isDebugTools
            ? [
                {
                  label: createMutation.isPending ? 'Creating...' : 'Reports smoke',
                  onClick: handleSmokeJob,
                  startIcon: <PlusCircle size={18} />,
                  variant: 'outlined' as const,
                },
              ]
            : []),
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
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          }}
        >
          <TextField select label="Type" value={jobType} onChange={(event) => setJobType(event.target.value)}>
            {TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Tenant context is required for report jobs.
          </Typography>
          <Button variant="outlined" onClick={() => setFiltersApplied((prev) => prev + 1)} disabled={!tenantId}>
            Apply Filters
          </Button>
        </Box>
      </PremiumCard>

      <PremiumCard noPadding>
        {(!data || data.length === 0) && !isLoading ? (
          <EmptyState
            title="No report jobs yet"
            description="Create an export job to start generating downloads."
            actionLabel="Create export"
            onAction={() => navigate('/reports/jobs/new')}
          />
        ) : (
          <DataGrid
            rows={data || []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowClick={(params) => navigate(`/reports/jobs/${params.row.id}`)}
          />
        )}
      </PremiumCard>
    </Box>
  );
};
