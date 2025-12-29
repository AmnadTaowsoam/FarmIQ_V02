import React, { useMemo, useState, useEffect } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography, Tabs, Tab, Collapse, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Upload, Download, Settings, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { useAuth } from '../../../contexts/AuthContext';
import { NeedHelpButton } from '../../../components/help/NeedHelpButton';
import { useStandardSets, useStandardsCatalog } from '../hooks/useStandards';


const SCOPES = [
  { value: '', label: 'All Scopes' },
  { value: 'GLOBAL', label: 'Global' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'FARM', label: 'Farm' },
  { value: 'HOUSE', label: 'House' },
  { value: 'FLOCK', label: 'Flock' },
];

const UNIT_SYSTEMS = [
  { value: '', label: 'All Units' },
  { value: 'METRIC', label: 'Metric' },
  { value: 'IMPERIAL', label: 'Imperial' },
];

const SEX_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'AS_HATCHED', label: 'As Hatched' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MIXED', label: 'Mixed' },
];

export const StandardsLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'platform_admin' || r === 'tenant_admin');

  const { data: catalog } = useStandardsCatalog();

  // Read initial state from URL
  const [standardSchemaCode, setStandardSchemaCode] = useState(searchParams.get('schema') || '');
  const [speciesCode, setSpeciesCode] = useState(searchParams.get('species') || '');
  const [geneticLineCode, setGeneticLineCode] = useState(searchParams.get('line') || '');
  const [setType, setSetType] = useState(searchParams.get('setType') || '');
  const [scope, setScope] = useState(searchParams.get('scope') || '');
  const [isActive, setIsActive] = useState<string>(searchParams.get('status') || '');
  const [unitSystem, setUnitSystem] = useState(searchParams.get('unitSystem') || '');
  const [sex, setSex] = useState(searchParams.get('sex') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (setType) params.set('setType', setType);
    if (standardSchemaCode) params.set('schema', standardSchemaCode);
    if (speciesCode) params.set('species', speciesCode);
    if (geneticLineCode) params.set('line', geneticLineCode);
    if (scope) params.set('scope', scope);
    if (isActive) params.set('status', isActive);
    if (unitSystem) params.set('unitSystem', unitSystem);
    if (sex) params.set('sex', sex);
    
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setType, standardSchemaCode, speciesCode, geneticLineCode, scope, isActive, unitSystem, sex]);

  const params = useMemo(
    () => ({
      standardSchemaCode: standardSchemaCode || undefined,
      speciesCode: speciesCode || undefined,
      geneticLineCode: geneticLineCode || undefined,
      setType: setType || undefined,
      scope: scope || undefined,
      isActive: isActive === '' ? undefined : isActive === 'active',
      unitSystem: unitSystem || undefined,
      sex: sex || undefined,
      page: 1,
      pageSize: 100,
    }),
    [standardSchemaCode, speciesCode, geneticLineCode, setType, scope, isActive, unitSystem, sex]
  );

  const { data, isLoading, error, refetch } = useStandardSets(params);

  const clearFilters = () => {
    setStandardSchemaCode('');
    setSpeciesCode('');
    setGeneticLineCode('');
    setSetType('');
    setScope('');
    setIsActive('');
    setUnitSystem('');
    setSex('');
  };

  const getSetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'REFERENCE': return 'primary';
      case 'STANDARD': return 'secondary';
      case 'TARGET': return 'success';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
    {
      field: 'standardSchema',
      headerName: 'Schema',
      width: 160,
      valueGetter: (_value, row: any) => row?.standardSchema?.code || row?.standardSchema?.displayName || '',
    },
    {
      field: 'species',
      headerName: 'Species',
      width: 140,
      valueGetter: (_value, row: any) => row?.species?.code || row?.species?.name || '',
    },
    {
      field: 'geneticLine',
      headerName: 'Line',
      width: 140,
      valueGetter: (_value, row: any) => row?.geneticLine?.code || row?.geneticLine?.name || '',
    },
    {
      field: 'setType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getSetTypeBadgeColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'unitSystem',
      headerName: 'Unit',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'METRIC' ? 'primary' : 'warning'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'sex',
      headerName: 'Sex',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value === 'AS_HATCHED' ? 'As Hatched' : params.value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'dayRange',
      headerName: 'Day Range',
      width: 130,
      valueGetter: (_value, row: any) => {
        const dayStart = row?.dayStart;
        const dayEnd = row?.dayEnd;
        
        if (dayStart !== null && dayStart !== undefined && dayEnd !== null && dayEnd !== undefined) {
          return `${dayStart}-${dayEnd}`;
        }
        if (dayStart !== null && dayStart !== undefined) {
          return `${dayStart}+`;
        }
        return 'All days';
      },
    },
    {
      field: 'scope',
      headerName: 'Scope',
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    { field: 'versionTag', headerName: 'Version', width: 140 },
    { field: 'isActive', headerName: 'Active', width: 90, type: 'boolean' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => navigate(`/standards/sets/${params.row.id}`)}>
            View
          </Button>
          {isAdmin && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/standards/targets/new?baseSetId=${params.row.id}`)}
              startIcon={<Copy size={16} />}
            >
              Clone
            </Button>
          )}
        </Stack>
      ),
    },
  ], [navigate, isAdmin]);

  return (
    <Box>
      <PageHeader
        title="Standards"
        subtitle="Reference / Standard / Target master data (growth, ventilation, lighting, environmental limits)"
        action={
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <>
                <Button variant="contained" startIcon={<Upload size={18} />} onClick={() => navigate('/standards/import')}>
                  Import CSV
                </Button>
                <Button variant="outlined" startIcon={<PlusCircle size={18} />} onClick={() => navigate('/standards/targets/new')}>
                  Create Target
                </Button>
                <Button variant="text" startIcon={<Download size={18} />} onClick={() => alert('Download templates feature coming soon')}>
                  Templates
                </Button>
                <Button variant="text" startIcon={<Settings size={18} />} onClick={() => navigate('/standards/catalog')}>
                  Catalog
                </Button>
                <NeedHelpButton />
              </>
            )}
          </Stack>
        }
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={setType} onChange={(_, v) => setSetType(v)}>
          <Tab label="All" value="" />
          <Tab label="Reference" value="REFERENCE" />
          <Tab label="Standard" value="STANDARD" />
          <Tab label="Target" value="TARGET" />
        </Tabs>
      </Box>

      <PremiumCard>
        {/* Primary Filters */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <TextField select label="Schema" value={standardSchemaCode} onChange={(e) => setStandardSchemaCode(e.target.value)} sx={{ minWidth: 240 }}>
            <MenuItem value="">All Schemas</MenuItem>
            {(catalog?.standardSchemas || []).map((s) => (
              <MenuItem key={s.code} value={s.code}>
                {s.code} - {s.displayName}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Species" value={speciesCode} onChange={(e) => setSpeciesCode(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">All Species</MenuItem>
            {(catalog?.species || []).map((s) => (
              <MenuItem key={s.code} value={s.code}>
                {s.code} - {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Genetic Line" value={geneticLineCode} onChange={(e) => setGeneticLineCode(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">All Lines</MenuItem>
            {(catalog?.geneticLines || []).map((l) => (
              <MenuItem key={l.code || l.id} value={l.code || ''} disabled={!l.code}>
                {(l.code || 'NO_CODE')} - {l.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} sx={{ minWidth: 200 }}>
            {SCOPES.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Status" value={isActive} onChange={(e) => setIsActive(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button>
          <Button variant="text" onClick={clearFilters}>
            Clear All
          </Button>
        </Stack>

        {/* Advanced Filters */}
        <Collapse in={showAdvanced}>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <TextField select label="Unit System" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} sx={{ minWidth: 200 }}>
              {UNIT_SYSTEMS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Sex" value={sex} onChange={(e) => setSex(e.target.value)} sx={{ minWidth: 200 }}>
              {SEX_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Collapse>

        {/* Error State */}
        {error ? (
          <ApiErrorState
            status={(error as any)?.response?.status}
            message={(error as any)?.message}
            endpoint="/api/v1/standards/sets"
            correlationId={(error as any)?.response?.headers?.['x-request-id']}
            onRetry={refetch}
          />
        ) : !isLoading && (!data?.items || data.items.length === 0) ? (
          /* Empty State */
          <EmptyState
            title="No Standards Found"
            description="Get started by importing reference data or creating your first standard set."
            actionLabel={isAdmin ? "Import CSV" : undefined}
            onAction={isAdmin ? () => navigate('/standards/import') : undefined}
            secondaryActionLabel={isAdmin ? "Create Set" : undefined}
            onSecondaryAction={isAdmin ? () => navigate('/standards/targets/new') : undefined}
          />
        ) : (
          /* Data Table */
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={data?.items || []}
              columns={columns}
              loading={isLoading}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              pageSizeOptions={[25, 50, 100]}
            />
            {data?.total !== undefined && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                Total: {data.total}
              </Typography>
            )}
          </Box>
        )}
      </PremiumCard>
    </Box>
  );
};
