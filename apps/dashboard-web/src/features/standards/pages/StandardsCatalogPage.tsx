import React, { useMemo, useState } from 'react';
import { Box, Button, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Save, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { standardsApi } from '../../../api/standards';
import { useStandardsCatalog } from '../hooks/useStandards';
import { useToast } from '../../../components/toast/useToast';

type StatusValue = 'true' | 'false';

export const StandardsCatalogPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: catalog, isLoading, error, refetch } = useStandardsCatalog();

  const [speciesCode, setSpeciesCode] = useState('');
  const [speciesName, setSpeciesName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [speciesActive, setSpeciesActive] = useState<StatusValue>('true');

  const [breederName, setBreederName] = useState('');
  const [breederCountry, setBreederCountry] = useState('');
  const [breederActive, setBreederActive] = useState<StatusValue>('true');

  const [geneticSpeciesCode, setGeneticSpeciesCode] = useState('');
  const [geneticBreederName, setGeneticBreederName] = useState('');
  const [geneticCode, setGeneticCode] = useState('');
  const [geneticName, setGeneticName] = useState('');
  const [geneticActive, setGeneticActive] = useState<StatusValue>('true');

  const speciesRows = useMemo(() => catalog?.species || [], [catalog?.species]);
  const geneticRows = useMemo(() => catalog?.geneticLines || [], [catalog?.geneticLines]);

  const reloadCatalog = async () => {
    await queryClient.invalidateQueries({ queryKey: ['standards', 'ui', 'catalog'] });
    await refetch();
  };

  const handleUpsertSpecies = async () => {
    if (!speciesCode.trim() || !speciesName.trim()) {
      toast.error('Species code and name are required.');
      return;
    }
    try {
      await standardsApi.upsertSpeciesCatalog({
        code: speciesCode.trim(),
        name: speciesName.trim(),
        scientificName: scientificName.trim() || undefined,
        isActive: speciesActive === 'true',
      });
      toast.success('Species saved');
      await reloadCatalog();
    } catch (e: any) {
      toast.error('Failed to save species', { description: e?.message || 'Unexpected error' });
    }
  };

  const handleUpsertBreeder = async () => {
    if (!breederName.trim()) {
      toast.error('Breeder company name is required.');
      return;
    }
    try {
      await standardsApi.upsertBreederCompany({
        name: breederName.trim(),
        country: breederCountry.trim() || undefined,
        isActive: breederActive === 'true',
      });
      toast.success('Breeder company saved');
      await reloadCatalog();
      if (!geneticBreederName) {
        setGeneticBreederName(breederName.trim());
      }
    } catch (e: any) {
      toast.error('Failed to save breeder company', { description: e?.message || 'Unexpected error' });
    }
  };

  const handleUpsertGeneticLine = async () => {
    if (!geneticSpeciesCode || !geneticBreederName || !geneticName.trim()) {
      toast.error('Species, breeder company, and line name are required.');
      return;
    }
    try {
      await standardsApi.upsertGeneticLineCatalog({
        speciesCode: geneticSpeciesCode,
        breederCompanyName: geneticBreederName,
        code: geneticCode.trim() || undefined,
        name: geneticName.trim(),
        isActive: geneticActive === 'true',
      });
      toast.success('Genetic line saved');
      await reloadCatalog();
    } catch (e: any) {
      toast.error('Failed to save genetic line', { description: e?.message || 'Unexpected error' });
    }
  };

  const speciesColumns: GridColDef[] = [
    { field: 'code', headerName: 'Code', width: 140 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'scientificName', headerName: 'Scientific Name', flex: 1, minWidth: 180 },
    { field: 'isActive', headerName: 'Active', type: 'boolean', width: 90 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() => {
            setSpeciesCode(params.row.code || '');
            setSpeciesName(params.row.name || '');
            setScientificName(params.row.scientificName || '');
            setSpeciesActive(params.row.isActive ? 'true' : 'false');
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const geneticColumns: GridColDef[] = [
    { field: 'code', headerName: 'Code', width: 140, valueGetter: (_v, row) => row?.code || '—' },
    { field: 'name', headerName: 'Line Name', flex: 1, minWidth: 180 },
    { field: 'speciesCode', headerName: 'Species', width: 140, valueGetter: (_v, row) => row?.species?.code || '—' },
    { field: 'breederCompany', headerName: 'Breeder', width: 180, valueGetter: (_v, row) => row?.breederCompany?.name || '—' },
    { field: 'isActive', headerName: 'Active', type: 'boolean', width: 90 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() => {
            setGeneticCode(params.row.code || '');
            setGeneticName(params.row.name || '');
            setGeneticSpeciesCode(params.row?.species?.code || '');
            setGeneticBreederName(params.row?.breederCompany?.name || '');
            setGeneticActive(params.row.isActive ? 'true' : 'false');
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <Box>
        <PageHeader title="Standards Catalog" subtitle="Manage species, breeder companies, and genetic lines" />
        <ApiErrorState
          status={(error as any)?.response?.status}
          message={(error as any)?.message}
          endpoint="/api/v1/standards/ui/catalog"
          correlationId={(error as any)?.response?.headers?.['x-request-id']}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Standards Catalog"
        subtitle="Manage Species and Genetic Line master data"
        action={
          <Button variant="outlined" startIcon={<RefreshCw size={18} />} onClick={reloadCatalog}>
            Refresh
          </Button>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <PremiumCard>
            <Stack spacing={2}>
              <Typography variant="h6">Species</Typography>
              <TextField label="Code" value={speciesCode} onChange={(e) => setSpeciesCode(e.target.value)} />
              <TextField label="Name" value={speciesName} onChange={(e) => setSpeciesName(e.target.value)} />
              <TextField
                label="Scientific Name"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
              />
              <TextField select label="Active" value={speciesActive} onChange={(e) => setSpeciesActive(e.target.value as StatusValue)}>
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </TextField>
              <Button variant="contained" startIcon={<Save size={18} />} onClick={handleUpsertSpecies}>
                Save Species
              </Button>
            </Stack>
          </PremiumCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <PremiumCard>
            <Stack spacing={2}>
              <Typography variant="h6">Breeder Company</Typography>
              <TextField
                label="Company Name"
                value={breederName}
                onChange={(e) => setBreederName(e.target.value)}
              />
              <TextField label="Country" value={breederCountry} onChange={(e) => setBreederCountry(e.target.value)} />
              <TextField select label="Active" value={breederActive} onChange={(e) => setBreederActive(e.target.value as StatusValue)}>
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </TextField>
              <Button variant="contained" startIcon={<Save size={18} />} onClick={handleUpsertBreeder}>
                Save Breeder
              </Button>
            </Stack>
          </PremiumCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <PremiumCard>
            <Stack spacing={2}>
              <Typography variant="h6">Genetic Line</Typography>
              <TextField
                select
                label="Species"
                value={geneticSpeciesCode}
                onChange={(e) => setGeneticSpeciesCode(e.target.value)}
              >
                {(catalog?.species || []).map((s) => (
                  <MenuItem key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Breeder Company"
                value={geneticBreederName}
                onChange={(e) => setGeneticBreederName(e.target.value)}
              >
                {(catalog?.breederCompanies || []).map((b) => (
                  <MenuItem key={b.id} value={b.name}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Code (optional)" value={geneticCode} onChange={(e) => setGeneticCode(e.target.value)} />
              <TextField label="Line Name" value={geneticName} onChange={(e) => setGeneticName(e.target.value)} />
              <TextField select label="Active" value={geneticActive} onChange={(e) => setGeneticActive(e.target.value as StatusValue)}>
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </TextField>
              <Button variant="contained" startIcon={<Save size={18} />} onClick={handleUpsertGeneticLine}>
                Save Genetic Line
              </Button>
            </Stack>
          </PremiumCard>
        </Grid>

        <Grid item xs={12}>
          <PremiumCard>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Species Catalog
            </Typography>
            <Box sx={{ height: 300 }}>
              <DataGrid
                rows={speciesRows}
                columns={speciesColumns}
                loading={isLoading}
                disableRowSelectionOnClick
                pageSizeOptions={[25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Genetic Line Catalog
            </Typography>
            <Box sx={{ height: 360 }}>
              <DataGrid
                rows={geneticRows}
                columns={geneticColumns}
                loading={isLoading}
                disableRowSelectionOnClick
                pageSizeOptions={[25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              />
            </Box>
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
