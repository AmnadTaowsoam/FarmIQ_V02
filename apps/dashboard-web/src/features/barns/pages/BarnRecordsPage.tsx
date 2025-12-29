import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  Grid,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ClipboardList, PlusCircle } from 'lucide-react';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { PageHeader } from '../../../components/PageHeader';
import { StatCard } from '../../../components/ui/StatCard';
import { SectionCard } from '../../../components/ui/SectionCard';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingCard } from '../../../components/LoadingCard';
import { BarnRecordsFilterBar, BarnRecordsFilters } from '../../../components/forms/BarnRecordsFilterBar';
import { barnRecordsApi, BarnRecordsError } from '../../../api/barnRecords';
import { useToast } from '../../../components/toast/useToast';
import { hasRequiredRole, Role } from '../../../config/routes';
import { useAuth } from '../../../contexts/AuthContext';

const DEFAULT_LIMIT = 25;

type TabKey =
  | 'daily-counts'
  | 'mortality'
  | 'morbidity'
  | 'vaccines'
  | 'treatments'
  | 'welfare-checks'
  | 'housing-conditions'
  | 'genetics';

const TAB_CONFIG: { key: TabKey; label: string; resource: string; supportsList: boolean; createRoles: Role[] }[] = [
  { key: 'daily-counts', label: 'Daily Counts', resource: 'daily-counts', supportsList: true, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator'] },
  { key: 'mortality', label: 'Mortality', resource: 'mortality', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator'] },
  { key: 'morbidity', label: 'Morbidity', resource: 'morbidity', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator'] },
  { key: 'vaccines', label: 'Vaccines', resource: 'vaccines', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager'] },
  { key: 'treatments', label: 'Treatments', resource: 'treatments', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager'] },
  { key: 'welfare-checks', label: 'Welfare Checks', resource: 'welfare-checks', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager'] },
  { key: 'housing-conditions', label: 'Housing Conditions', resource: 'housing-conditions', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager'] },
  { key: 'genetics', label: 'Genetics', resource: 'genetics', supportsList: false, createRoles: ['platform_admin', 'tenant_admin', 'farm_manager'] },
];

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const buildColumns = (tab: TabKey): Column<Record<string, any>>[] => {
  switch (tab) {
    case 'daily-counts':
      return [
        { id: 'recordDate', label: 'Date', format: (_value, row) => row.recordDate || row.record_date || '—' },
        { id: 'animalCount', label: 'Animal Count', align: 'right', format: (_value, row) => row.animalCount ?? row.animal_count ?? '—' },
        { id: 'mortalityCount', label: 'Mortality', align: 'right', format: (_value, row) => row.mortalityCount ?? row.mortality_count ?? '—' },
        { id: 'cullCount', label: 'Cull', align: 'right', format: (_value, row) => row.cullCount ?? row.cull_count ?? '—' },
        { id: 'averageWeightKg', label: 'Avg Weight (kg)', align: 'right', format: (_value, row) => row.averageWeightKg ?? row.average_weight_kg ?? '—' },
      ];
    case 'mortality':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'animalCount', label: 'Count', align: 'right', format: (_value, row) => row.animalCount ?? row.animal_count ?? '—' },
        { id: 'causeCode', label: 'Cause', format: (_value, row) => row.causeCode || row.cause_code || '—' },
        { id: 'notes', label: 'Notes', format: (_value, row) => row.notes || '—' },
      ];
    case 'morbidity':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'animalCount', label: 'Count', align: 'right', format: (_value, row) => row.animalCount ?? row.animal_count ?? '—' },
        { id: 'diseaseCode', label: 'Disease', format: (_value, row) => row.diseaseCode || row.disease_code || '—' },
        { id: 'severity', label: 'Severity', format: (_value, row) => row.severity || '—' },
      ];
    case 'vaccines':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'vaccineName', label: 'Vaccine', format: (_value, row) => row.vaccineName || row.vaccine_name || '—' },
        { id: 'doseMl', label: 'Dose (ml)', align: 'right', format: (_value, row) => row.doseMl ?? row.dose_ml ?? '—' },
        { id: 'animalCount', label: 'Count', align: 'right', format: (_value, row) => row.animalCount ?? row.animal_count ?? '—' },
      ];
    case 'treatments':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'treatmentName', label: 'Treatment', format: (_value, row) => row.treatmentName || row.treatment_name || '—' },
        { id: 'doseMl', label: 'Dose (ml)', align: 'right', format: (_value, row) => row.doseMl ?? row.dose_ml ?? '—' },
        { id: 'animalCount', label: 'Count', align: 'right', format: (_value, row) => row.animalCount ?? row.animal_count ?? '—' },
      ];
    case 'welfare-checks':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'gaitScore', label: 'Gait', align: 'right', format: (_value, row) => row.gaitScore ?? row.gait_score ?? '—' },
        { id: 'lesionScore', label: 'Lesion', align: 'right', format: (_value, row) => row.lesionScore ?? row.lesion_score ?? '—' },
        { id: 'behaviorScore', label: 'Behavior', align: 'right', format: (_value, row) => row.behaviorScore ?? row.behavior_score ?? '—' },
      ];
    case 'housing-conditions':
      return [
        { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDate(row.occurredAt || row.occurred_at) },
        { id: 'stockingDensity', label: 'Stocking Density', align: 'right', format: (_value, row) => row.stockingDensity ?? row.stocking_density ?? '—' },
        { id: 'beddingType', label: 'Bedding', format: (_value, row) => row.beddingType || row.bedding_type || '—' },
        { id: 'ventilationMode', label: 'Ventilation', format: (_value, row) => row.ventilationMode || row.ventilation_mode || '—' },
      ];
    case 'genetics':
      return [
        { id: 'batchId', label: 'Batch', format: (_value, row) => row.batchId || row.batch_id || '—' },
        { id: 'strain', label: 'Strain', format: (_value, row) => row.strain || '—' },
        { id: 'breedLine', label: 'Breed Line', format: (_value, row) => row.breedLine || row.breed_line || '—' },
        { id: 'hatchDate', label: 'Hatch Date', format: (_value, row) => row.hatchDate || row.hatch_date || '—' },
      ];
    default:
      return [];
  }
};

const buildCreatePayload = (
  tab: TabKey,
  context: BarnRecordsFilters,
  baseContext: { tenantId: string; farmId?: string | null; barnId?: string | null; batchId?: string | null },
  form: Record<string, string>
) => {
  const common = {
    tenantId: baseContext.tenantId,
    farmId: context.farmId || baseContext.farmId || undefined,
    barnId: context.barnId || baseContext.barnId || undefined,
    batchId: context.batchId || baseContext.batchId || undefined,
  };

  switch (tab) {
    case 'daily-counts':
      return {
        ...common,
        recordDate: form.recordDate,
        animalCount: Number(form.animalCount || 0),
        mortalityCount: form.mortalityCount ? Number(form.mortalityCount) : undefined,
        cullCount: form.cullCount ? Number(form.cullCount) : undefined,
        averageWeightKg: form.averageWeightKg ? Number(form.averageWeightKg) : undefined,
      };
    case 'mortality':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        animalCount: Number(form.animalCount || 0),
        causeCode: form.causeCode || undefined,
        notes: form.notes || undefined,
      };
    case 'morbidity':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        animalCount: Number(form.animalCount || 0),
        diseaseCode: form.diseaseCode || undefined,
        severity: form.severity || undefined,
        notes: form.notes || undefined,
      };
    case 'vaccines':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        vaccineName: form.vaccineName,
        doseMl: form.doseMl ? Number(form.doseMl) : undefined,
        animalCount: form.animalCount ? Number(form.animalCount) : undefined,
        route: form.route || undefined,
      };
    case 'treatments':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        treatmentName: form.treatmentName,
        doseMl: form.doseMl ? Number(form.doseMl) : undefined,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        animalCount: form.animalCount ? Number(form.animalCount) : undefined,
      };
    case 'welfare-checks':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        gaitScore: form.gaitScore ? Number(form.gaitScore) : undefined,
        lesionScore: form.lesionScore ? Number(form.lesionScore) : undefined,
        behaviorScore: form.behaviorScore ? Number(form.behaviorScore) : undefined,
      };
    case 'housing-conditions':
      return {
        ...common,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
        stockingDensity: form.stockingDensity ? Number(form.stockingDensity) : undefined,
        beddingType: form.beddingType || undefined,
        ventilationMode: form.ventilationMode || undefined,
        temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
        humidityPct: form.humidityPct ? Number(form.humidityPct) : undefined,
        ammoniaPpm: form.ammoniaPpm ? Number(form.ammoniaPpm) : undefined,
      };
    case 'genetics':
      return {
        tenantId: baseContext.tenantId,
        batchId: context.batchId || baseContext.batchId || undefined,
        strain: form.strain || undefined,
        breedLine: form.breedLine || undefined,
        supplier: form.supplier || undefined,
        hatchDate: form.hatchDate || undefined,
      };
    default:
      return common;
  }
};

const defaultFormState = () => ({
  occurredAt: new Date().toISOString().slice(0, 16),
  recordDate: new Date().toISOString().slice(0, 10),
  animalCount: '',
  mortalityCount: '',
  cullCount: '',
  averageWeightKg: '',
  causeCode: '',
  diseaseCode: '',
  severity: '',
  notes: '',
  vaccineName: '',
  doseMl: '',
  route: '',
  treatmentName: '',
  durationDays: '',
  gaitScore: '',
  lesionScore: '',
  behaviorScore: '',
  stockingDensity: '',
  beddingType: '',
  ventilationMode: '',
  temperatureC: '',
  humidityPct: '',
  ammoniaPpm: '',
  strain: '',
  breedLine: '',
  supplier: '',
  hatchDate: '',
});

export const BarnRecordsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [filters, setFilters] = useState<BarnRecordsFilters>({
    farmId: farmId || '',
    barnId: barnId || '',
    batchId: batchId || '',
    startDate: timeRange.start.toISOString().slice(0, 10),
    endDate: timeRange.end.toISOString().slice(0, 10),
  });
  const filtersRef = useRef(filters);
  const [activeTab, setActiveTab] = useState<TabKey>('daily-counts');
  const [data, setData] = useState<Record<TabKey, { items: any[]; nextCursor?: string | null }>>({
    'daily-counts': { items: [] },
    mortality: { items: [] },
    morbidity: { items: [] },
    vaccines: { items: [] },
    treatments: { items: [] },
    'welfare-checks': { items: [] },
    'housing-conditions': { items: [] },
    genetics: { items: [] },
  });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    'daily-counts': false,
    mortality: false,
    morbidity: false,
    vaccines: false,
    treatments: false,
    'welfare-checks': false,
    'housing-conditions': false,
    genetics: false,
  });
  const [history, setHistory] = useState<Record<TabKey, any[]>>({
    'daily-counts': [],
    mortality: [],
    morbidity: [],
    vaccines: [],
    treatments: [],
    'welfare-checks': [],
    'housing-conditions': [],
    genetics: [],
  });
  const [error, setError] = useState<BarnRecordsError | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'details'>('create');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [formState, setFormState] = useState<Record<string, string>>(defaultFormState());

  const currentConfig = TAB_CONFIG.find((tab) => tab.key === activeTab) || TAB_CONFIG[0];
  const userRoles = (user?.roles || []) as Role[];
  const canCreate = hasRequiredRole(userRoles, currentConfig.createRoles);

  const resetFilters = () => {
    const nextFilters = {
      farmId: farmId || '',
      barnId: barnId || '',
      batchId: batchId || '',
      startDate: timeRange.start.toISOString().slice(0, 10),
      endDate: timeRange.end.toISOString().slice(0, 10),
    };
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
  };

  const fetchTab = useCallback(async (
    tab: TabKey,
    options?: { cursor?: string; replace?: boolean; filters?: BarnRecordsFilters }
  ) => {
    if (!tenantId) return;
    const effectiveFilters = options?.filters || filtersRef.current;
    const config = TAB_CONFIG.find((item) => item.key === tab) || TAB_CONFIG[0];
    if (!config.supportsList) return;
    setLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const response = await barnRecordsApi.listRecords<any>(
        config.resource,
        {
          tenantId,
          farmId: effectiveFilters.farmId || farmId || undefined,
          barnId: effectiveFilters.barnId || barnId || undefined,
          batchId: effectiveFilters.batchId || batchId || undefined,
        },
        {
          startDate: effectiveFilters.startDate,
          endDate: effectiveFilters.endDate,
          limit: DEFAULT_LIMIT,
          cursor: options?.cursor,
        }
      );
      setData((prev) => ({
        ...prev,
        [tab]: {
          items: options?.replace ? response.items : [...prev[tab].items, ...response.items],
          nextCursor: response.nextCursor,
        },
      }));
      setError(null);
      setServiceUnavailable(false);
    } catch (err: any) {
      const apiError = err as BarnRecordsError;
      setError(apiError);
      if (apiError.isServiceUnavailable) {
        setServiceUnavailable(true);
      }
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [tenantId, farmId, barnId, batchId]);

  const applyFilters = () => {
    if (!filters.barnId && !barnId) {
      toast.error('Select a barn before applying filters.');
      return;
    }
    filtersRef.current = filters;
    fetchTab(activeTab, { replace: true, filters });
  };

  const openCreateDrawer = () => {
    setFormState(defaultFormState());
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openDetailsDrawer = (row: any) => {
    setSelectedRow(row);
    setDrawerMode('details');
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    const effectiveBarnId = filters.barnId || barnId;
    const effectiveBatchId = filters.batchId || batchId;
    if (!effectiveBarnId && activeTab !== 'genetics') {
      toast.error('Barn is required to create records.');
      return;
    }
    if (activeTab === 'genetics' && !effectiveBatchId) {
      toast.error('Batch is required to create genetics records.');
      return;
    }
    if (activeTab === 'daily-counts' && !formState.recordDate) {
      toast.error('Record date is required.');
      return;
    }
    if (activeTab !== 'daily-counts' && activeTab !== 'genetics' && !formState.occurredAt) {
      toast.error('Occurred at is required.');
      return;
    }
    if (activeTab === 'vaccines' && !formState.vaccineName) {
      toast.error('Vaccine name is required.');
      return;
    }
    if (activeTab === 'treatments' && !formState.treatmentName) {
      toast.error('Treatment name is required.');
      return;
    }
    try {
      const payload = buildCreatePayload(activeTab, filters, { tenantId, farmId, barnId, batchId }, formState);
      const created = await barnRecordsApi.createRecord(currentConfig.resource, payload);
      toast.success('Record created');
      setHistory((prev) => ({
        ...prev,
        [activeTab]: [created, ...prev[activeTab]].slice(0, 25),
      }));
      setDrawerOpen(false);
      fetchTab(activeTab, { replace: true });
    } catch (err: any) {
      const apiError = err as BarnRecordsError;
      if (apiError.isServiceUnavailable) {
        setServiceUnavailable(true);
      }
      toast.error('Failed to create record', { description: apiError.message });
    }
  };

  const summaryStats = useMemo(() => {
    const mortalityFromDaily = data['daily-counts'].items.reduce(
      (sum, item) => sum + (item.mortalityCount || item.mortality_count || 0),
      0
    );
    const mortalityFromHistory = history.mortality.reduce(
      (sum, item) => sum + (item.animalCount || item.animal_count || 0),
      0
    );
    const morbidityFromHistory = history.morbidity.reduce(
      (sum, item) => sum + (item.animalCount || item.animal_count || 0),
      0
    );
    const daily = data['daily-counts'].items[0];
    const animalCount = daily?.animalCount ?? daily?.animal_count;
    const mortalityTotal = mortalityFromDaily || mortalityFromHistory;
    const mortalityRate = animalCount ? ((mortalityTotal / animalCount) * 100).toFixed(2) : null;
    return {
      mortality: mortalityTotal || '—',
      morbidity: morbidityFromHistory || '—',
      animalCount: animalCount ?? '—',
      mortalityRate: mortalityRate ? `${mortalityRate}%` : '—',
    };
  }, [data, history]);

  useEffect(() => {
    if (tenantId) {
      fetchTab(activeTab, { replace: true });
    }
  }, [tenantId, activeTab, fetchTab]);

  const renderTabContent = () => {
    const tabData = data[activeTab];
    const isLoading = loading[activeTab];
    const columns = buildColumns(activeTab);
    const config = TAB_CONFIG.find((item) => item.key === activeTab) || TAB_CONFIG[0];

    if (serviceUnavailable) {
      return (
        <EmptyState
          title="Service not available yet"
          description="Barn records service is not reachable. Please retry later or contact support."
          actionLabel="Retry"
          onAction={() => {
            setServiceUnavailable(false);
            fetchTab(activeTab, { replace: true });
          }}
        />
      );
    }

    if (error && !serviceUnavailable) {
      return (
        <SectionCard title="Unable to load records">
          <Stack spacing={2}>
            <Typography color="error.main">{error.message}</Typography>
            <Typography variant="caption" color="text.secondary">
              Request ID: {error.requestId || 'n/a'}
            </Typography>
            <Button variant="outlined" onClick={() => fetchTab(activeTab, { replace: true })}>
              Retry
            </Button>
          </Stack>
        </SectionCard>
      );
    }

    if (config.supportsList && isLoading && tabData.items.length === 0) {
      return <LoadingCard title="Loading records" lines={3} />;
    }

    if (config.supportsList && !isLoading && tabData.items.length === 0) {
      return (
        <EmptyState
          title="No records for this date range"
          description="Adjust filters or create a new record."
        />
      );
    }

    if (!config.supportsList) {
      const recentItems = history[activeTab];
      return (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Records are event-based and available through audit history; recent submissions are shown below.
          </Typography>
          {recentItems.length === 0 ? (
            <EmptyState
              title="No recent submissions"
              description="Create a new record to see recent activity."
            />
          ) : (
            <BasicTable
              columns={columns}
              data={recentItems}
              rowKey="id"
              onRowClick={openDetailsDrawer}
            />
          )}
        </>
      );
    }

    return (
      <>
        <BasicTable
          columns={columns}
          data={tabData.items}
          rowKey="id"
          onRowClick={openDetailsDrawer}
        />
        {tabData.nextCursor && (
          <Box mt={2} display="flex" justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => fetchTab(activeTab, { cursor: tabData.nextCursor })}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </Button>
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Health & Records"
        subtitle="Track daily counts, health events, welfare checks, and housing conditions"
      />

      <BarnRecordsFilterBar
        value={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        loading={loading[activeTab]}
      />

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Mortality"
            value={summaryStats.mortality || '—'}
            subtitle="Selected range"
            icon={<ClipboardList size={18} />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Morbidity"
            value={summaryStats.morbidity || '—'}
            subtitle="Selected range"
            icon={<ClipboardList size={18} />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Current Animal Count"
            value={summaryStats.animalCount ?? '—'}
            subtitle="Latest daily count"
            icon={<ClipboardList size={18} />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Mortality Rate"
            value={summaryStats.mortalityRate || '—'}
            subtitle="Derived"
            icon={<ClipboardList size={18} />}
          />
        </Grid>
      </Grid>

      <SectionCard
        title={currentConfig.label}
        action={
          <Tooltip title={canCreate ? '' : 'Insufficient permission'}>
            <span>
              <Button
                variant="contained"
                startIcon={<PlusCircle size={18} />}
                onClick={openCreateDrawer}
                disabled={!canCreate}
              >
                Create
              </Button>
            </span>
          </Tooltip>
        }
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => {
            setActiveTab(value);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {TAB_CONFIG.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>
        <Divider sx={{ mb: 2 }} />
        {renderTabContent()}
      </SectionCard>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 320, md: 420 }, p: 3 }}>
          {drawerMode === 'details' && selectedRow && (
            <>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Record Details
              </Typography>
              <Stack spacing={1}>
                {Object.entries(selectedRow).map(([key, value]) => (
                  <Box key={key}>
                    <Typography variant="caption" color="text.secondary">
                      {key}
                    </Typography>
                    <Typography variant="body2">{String(value)}</Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {drawerMode === 'create' && (
            <>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Create {currentConfig.label}
              </Typography>
              <Grid container spacing={2}>
                {activeTab !== 'genetics' && activeTab !== 'daily-counts' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Occurred At"
                      type="datetime-local"
                      size="small"
                      fullWidth
                      value={formState.occurredAt}
                      onChange={(event) => setFormState((prev) => ({ ...prev, occurredAt: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
                {activeTab === 'daily-counts' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Record Date"
                      type="date"
                      size="small"
                      fullWidth
                      value={formState.recordDate}
                      onChange={(event) => setFormState((prev) => ({ ...prev, recordDate: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
                {['mortality', 'morbidity', 'vaccines', 'treatments'].includes(activeTab) && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Animal Count"
                      type="number"
                      size="small"
                      fullWidth
                      value={formState.animalCount}
                      onChange={(event) => setFormState((prev) => ({ ...prev, animalCount: event.target.value }))}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                )}
                {activeTab === 'mortality' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Cause Code"
                      size="small"
                      fullWidth
                      value={formState.causeCode}
                      onChange={(event) => setFormState((prev) => ({ ...prev, causeCode: event.target.value }))}
                    />
                  </Grid>
                )}
                {activeTab === 'morbidity' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Disease Code"
                        size="small"
                        fullWidth
                        value={formState.diseaseCode}
                        onChange={(event) => setFormState((prev) => ({ ...prev, diseaseCode: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Severity (low/medium/high)"
                        size="small"
                        fullWidth
                        value={formState.severity}
                        onChange={(event) => setFormState((prev) => ({ ...prev, severity: event.target.value }))}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'vaccines' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Vaccine Name"
                        size="small"
                        fullWidth
                        value={formState.vaccineName}
                        onChange={(event) => setFormState((prev) => ({ ...prev, vaccineName: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Dose (ml)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.doseMl}
                        onChange={(event) => setFormState((prev) => ({ ...prev, doseMl: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Route"
                        size="small"
                        fullWidth
                        value={formState.route}
                        onChange={(event) => setFormState((prev) => ({ ...prev, route: event.target.value }))}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'treatments' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Treatment Name"
                        size="small"
                        fullWidth
                        value={formState.treatmentName}
                        onChange={(event) => setFormState((prev) => ({ ...prev, treatmentName: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Dose (ml)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.doseMl}
                        onChange={(event) => setFormState((prev) => ({ ...prev, doseMl: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Duration Days"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.durationDays}
                        onChange={(event) => setFormState((prev) => ({ ...prev, durationDays: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'welfare-checks' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Gait Score (0-5)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.gaitScore}
                        onChange={(event) => setFormState((prev) => ({ ...prev, gaitScore: event.target.value }))}
                        inputProps={{ min: 0, max: 5 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Lesion Score (0-5)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.lesionScore}
                        onChange={(event) => setFormState((prev) => ({ ...prev, lesionScore: event.target.value }))}
                        inputProps={{ min: 0, max: 5 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Behavior Score (0-5)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.behaviorScore}
                        onChange={(event) => setFormState((prev) => ({ ...prev, behaviorScore: event.target.value }))}
                        inputProps={{ min: 0, max: 5 }}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'housing-conditions' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Stocking Density"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.stockingDensity}
                        onChange={(event) => setFormState((prev) => ({ ...prev, stockingDensity: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Bedding Type"
                        size="small"
                        fullWidth
                        value={formState.beddingType}
                        onChange={(event) => setFormState((prev) => ({ ...prev, beddingType: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Ventilation Mode"
                        size="small"
                        fullWidth
                        value={formState.ventilationMode}
                        onChange={(event) => setFormState((prev) => ({ ...prev, ventilationMode: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Temperature (C)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.temperatureC}
                        onChange={(event) => setFormState((prev) => ({ ...prev, temperatureC: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Humidity (%)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.humidityPct}
                        onChange={(event) => setFormState((prev) => ({ ...prev, humidityPct: event.target.value }))}
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Ammonia (ppm)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.ammoniaPpm}
                        onChange={(event) => setFormState((prev) => ({ ...prev, ammoniaPpm: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'genetics' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Strain"
                        size="small"
                        fullWidth
                        value={formState.strain}
                        onChange={(event) => setFormState((prev) => ({ ...prev, strain: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Breed Line"
                        size="small"
                        fullWidth
                        value={formState.breedLine}
                        onChange={(event) => setFormState((prev) => ({ ...prev, breedLine: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Supplier"
                        size="small"
                        fullWidth
                        value={formState.supplier}
                        onChange={(event) => setFormState((prev) => ({ ...prev, supplier: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Hatch Date"
                        type="date"
                        size="small"
                        fullWidth
                        value={formState.hatchDate}
                        onChange={(event) => setFormState((prev) => ({ ...prev, hatchDate: event.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
                {activeTab === 'daily-counts' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Animal Count"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.animalCount}
                        onChange={(event) => setFormState((prev) => ({ ...prev, animalCount: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Mortality Count"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.mortalityCount}
                        onChange={(event) => setFormState((prev) => ({ ...prev, mortalityCount: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Cull Count"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.cullCount}
                        onChange={(event) => setFormState((prev) => ({ ...prev, cullCount: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Average Weight (kg)"
                        type="number"
                        size="small"
                        fullWidth
                        value={formState.averageWeightKg}
                        onChange={(event) => setFormState((prev) => ({ ...prev, averageWeightKg: event.target.value }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Tooltip title={canCreate ? '' : 'Insufficient permission'}>
                    <span>
                      <Button variant="contained" onClick={handleSubmit} disabled={!canCreate}>
                        Submit
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};
