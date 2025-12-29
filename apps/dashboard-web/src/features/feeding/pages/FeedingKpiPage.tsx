import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Typography, Button, Stack } from '@mui/material';
import { TrendingUp, ClipboardList } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { TimeRangeSelector } from '../../../components/forms/TimeRangeSelector';
import { StatCard } from '../../../components/ui/StatCard';
import { SectionCard } from '../../../components/ui/SectionCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { feedingApi } from '../api';
import { formatDate } from '../../../utils/format';
import { NeedHelpButton } from '../../../components/help/NeedHelpButton';

interface KpiPoint {
  recordDate?: string;
  record_date?: string;
  fcr?: number | null;
  adgG?: number | null;
  adg_g?: number | null;
  sgrPct?: number | null;
  sgr_pct?: number | null;
  totalFeedKg?: number | null;
  total_feed_kg?: number | null;
  weightGainKg?: number | null;
  weight_gain_kg?: number | null;
  animalCount?: number | null;
  animal_count?: number | null;
  intakeMissingFlag?: boolean;
  intake_missing_flag?: boolean;
  weightMissingFlag?: boolean;
  weight_missing_flag?: boolean;
}

const getField = <T,>(value: T | undefined, fallback?: T) => (value !== undefined ? value : fallback);

const normalizeKpiPoints = (payload: any): KpiPoint[] => {
  if (!payload) return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.kpis)) return payload.kpis;
  return [];
};

export const FeedingKpiPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [data, setData] = useState<KpiPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const startDate = timeRange.start.toISOString().slice(0, 10);
        const endDate = timeRange.end.toISOString().slice(0, 10);
        const response = await feedingApi.getKpiFeeding(
          { tenantId, farmId, barnId, batchId },
          { startDate, endDate }
        );
        setData(normalizeKpiPoints(response));
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load feeding KPIs');
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [tenantId, farmId, barnId, batchId, timeRange.start, timeRange.end]);

  const latest = data.length > 0 ? data[data.length - 1] : null;

  const tableColumns: Column<KpiPoint>[] = useMemo(() => [
    {
      id: 'recordDate',
      label: 'Date',
      format: (_value, row) => {
        const raw = getField(row.recordDate, row.record_date) || '';
        return raw ? formatDate(raw) : '—';
      },
    },
    {
      id: 'fcr',
      label: 'FCR',
      align: 'right',
      format: (_value, row) => {
        const value = getField(row.fcr, row.fcr);
        return value !== undefined && value !== null ? value.toFixed(2) : '—';
      },
    },
    {
      id: 'adgG',
      label: 'ADG (g/day)',
      align: 'right',
      format: (_value, row) => {
        const value = getField(row.adgG, row.adg_g);
        return value !== undefined && value !== null ? value.toFixed(1) : '—';
      },
    },
    {
      id: 'sgrPct',
      label: 'SGR (%)',
      align: 'right',
      format: (_value, row) => {
        const value = getField(row.sgrPct, row.sgr_pct);
        return value !== undefined && value !== null ? value.toFixed(2) : '—';
      },
    },
    {
      id: 'totalFeedKg',
      label: 'Feed (kg)',
      align: 'right',
      format: (_value, row) => {
        const value = getField(row.totalFeedKg, row.total_feed_kg);
        return value !== undefined && value !== null ? value.toLocaleString() : '—';
      },
    },
    {
      id: 'weightGainKg',
      label: 'Gain (kg)',
      align: 'right',
      format: (_value, row) => {
        const value = getField(row.weightGainKg, row.weight_gain_kg);
        return value !== undefined && value !== null ? value.toLocaleString() : '—';
      },
    },
    {
      id: 'flags',
      label: 'Flags',
      format: (_value, row) => {
        const intakeMissing = getField(row.intakeMissingFlag, row.intake_missing_flag);
        const weightMissing = getField(row.weightMissingFlag, row.weight_missing_flag);
        if (intakeMissing || weightMissing) {
          return (
            <Typography variant="caption" color="warning.main" fontWeight={600}>
              {intakeMissing ? 'Intake missing' : ''}{intakeMissing && weightMissing ? ' • ' : ''}{weightMissing ? 'Weight missing' : ''}
            </Typography>
          );
        }
        return <Typography variant="caption" color="text.secondary">OK</Typography>;
      },
    },
  ], []);

  const chartData = useMemo(() => data.map((point) => ({
    timestamp: getField(point.recordDate, point.record_date) || '',
    fcr: getField(point.fcr, point.fcr) || 0,
    adg: getField(point.adgG, point.adg_g) || 0,
    sgr: getField(point.sgrPct, point.sgr_pct) || 0,
  })), [data]);

  const handleDrilldown = () => {
    const startDate = timeRange.start.toISOString().slice(0, 10);
    const endDate = timeRange.end.toISOString().slice(0, 10);
    const params = new URLSearchParams(searchParams);
    params.set('start', startDate);
    params.set('end', endDate);
    navigate(`/feeding/intake?${params.toString()}`);
  };

  if (error) {
    return <ErrorState title="Failed to load feeding KPIs" message={error} />;
  }

  if (loading && data.length === 0) {
    return (
      <Box>
        <PageHeader
          title="Feeding KPI Dashboard"
          subtitle="FCR, ADG, and SGR performance trends"
          action={<TimeRangeSelector />}
        />
        <LoadingCard title="Loading KPI series" lines={4} />
      </Box>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <Box>
        <PageHeader
          title="Feeding KPI Dashboard"
          subtitle="FCR, ADG, and SGR performance trends"
          action={<TimeRangeSelector />}
        />
        <EmptyState title="No KPI data yet" description="Feed intake and weight data are required to compute KPIs." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Feeding KPI Dashboard"
        subtitle="FCR, ADG, and SGR performance trends"
        action={
          <Stack direction="row" spacing={1}>
            <NeedHelpButton />
            <TimeRangeSelector />
            <Button
              variant="outlined"
              startIcon={<ClipboardList size={18} />}
              onClick={handleDrilldown}
            >
              View Intake Records
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="FCR"
            value={latest?.fcr !== undefined && latest?.fcr !== null ? latest.fcr.toFixed(2) : '—'}
            subtitle="Feed conversion ratio"
            icon={<TrendingUp size={18} />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="ADG"
            value={(latest?.adgG ?? latest?.adg_g) !== undefined && (latest?.adgG ?? latest?.adg_g) !== null
              ? `${(latest?.adgG ?? latest?.adg_g)!.toFixed(1)} g/day`
              : '—'}
            subtitle="Average daily gain"
            icon={<TrendingUp size={18} />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="SGR"
            value={(latest?.sgrPct ?? latest?.sgr_pct) !== undefined && (latest?.sgrPct ?? latest?.sgr_pct) !== null
              ? `${(latest?.sgrPct ?? latest?.sgr_pct)!.toFixed(2)}%`
              : '—'}
            subtitle="Specific growth rate"
            icon={<TrendingUp size={18} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SectionCard
            title="KPI Trend"
            subtitle="Daily KPI trend across the selected range"
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">FCR / ADG / SGR</Typography>
              </Stack>
            }
          >
            <TimeSeriesChart
              data={chartData}
              lines={[
                { key: 'fcr', label: 'FCR', color: '#ff7a59' },
                { key: 'adg', label: 'ADG (g/day)', color: '#3f8cff' },
                { key: 'sgr', label: 'SGR (%)', color: '#2fbf71' },
              ]}
              loading={loading}
              height={340}
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="KPI Records" subtitle="Daily KPI records and quality flags">
            <BasicTable<KpiPoint>
              columns={tableColumns}
              data={data}
              loading={loading}
              rowKey="record_date"
              emptyMessage="No KPI records found for the selected range."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
