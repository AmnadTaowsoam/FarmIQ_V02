import React, { useMemo, useState } from 'react';
import { alpha, Box, Button, Chip, Divider, MenuItem, Stack, TextField, Typography, useTheme } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Download, FileSpreadsheet, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useImportStandardsCsv, useStandardsCatalog } from '../hooks/useStandards';
import { useToast } from '../../../components/toast/useToast';

const SET_TYPES = ['REFERENCE', 'STANDARD', 'TARGET'] as const;
const SCOPES = ['GLOBAL', 'TENANT', 'FARM', 'HOUSE', 'FLOCK'] as const;
const UNIT_SYSTEMS = ['METRIC', 'IMPERIAL'] as const;
const SEXES = ['AS_HATCHED', 'MALE', 'FEMALE', 'MIXED'] as const;

function templateForSchema(code: string) {
  if (code === 'GROWTH')
    return 'age_day,body_weight_g,daily_gain_g,avg_daily_gain_g,daily_feed_intake_g,cum_feed_intake_g,fcr,cum_fcr\n1,40,0,0,0,0,0,0\n';
  if (code === 'VENTILATION')
    return 'age_week,avg_body_weight_g,min_vent_m3_per_kg_hr_for_5000\n1,100,0\n';
  if (code === 'LIGHTING') return 'age_day,hours_light,lux\n1,23,20\n';
  return 'phase,temp_c_min,temp_c_max,humidity_pct_min,humidity_pct_max,o2_pct_min,co2_pct_max_pct,co_ppm_max,nh3_ppm_max,dust_mg_m3_max\nbrooding,32,34,55,70,19.5,0.3,50,10,3\n';
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const StandardsImportPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const { tenantId, farmId, barnId } = useActiveContext();
  const importMutation = useImportStandardsCsv();

  const { data: catalog } = useStandardsCatalog();

  const [standardSchemaCode, setStandardSchemaCode] = useState<string>('GROWTH');
  const [speciesCode, setSpeciesCode] = useState<string>('chicken');
  const [geneticLineCode, setGeneticLineCode] = useState<string>('COBB500');
  const [setType, setSetType] = useState<(typeof SET_TYPES)[number]>('REFERENCE');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('TENANT');
  const [unitSystem, setUnitSystem] = useState<(typeof UNIT_SYSTEMS)[number]>('METRIC');
  const [sex, setSex] = useState<(typeof SEXES)[number]>('AS_HATCHED');
  const [versionTag, setVersionTag] = useState('v1');
  const [dryRun, setDryRun] = useState('true');
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const isCommitMode = dryRun === 'false';

  const previewColumns: GridColDef[] = useMemo(
    () => [
      { field: 'dimType', headerName: 'Dim', width: 120 },
      { field: 'dimFrom', headerName: 'From', width: 100 },
      { field: 'phase', headerName: 'Phase', width: 160 },
      {
        field: 'payloadJson',
        headerName: 'Payload',
        flex: 1,
        minWidth: 260,
        valueGetter: (value) => JSON.stringify(value),
      },
    ],
    []
  );

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!file) {
      setError(new Error('Please select a CSV file.'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('standardSchemaCode', standardSchemaCode);
    formData.append('setType', setType);
    formData.append('scope', scope);
    formData.append('unitSystem', unitSystem);
    formData.append('sex', sex);
    formData.append('versionTag', versionTag);
    formData.append('dryRun', dryRun);
    formData.append('speciesCode', speciesCode);
    if (geneticLineCode) formData.append('geneticLineCode', geneticLineCode);
    if (scope !== 'GLOBAL') formData.append('tenantId', tenantId || '');
    if (scope === 'FARM') formData.append('farmId', farmId || '');
    if (scope === 'HOUSE') formData.append('houseId', barnId || '');

    try {
      const payload = await importMutation.mutateAsync(formData);
      setResult(payload);
      if (payload?.setId) {
        toast.success('Import committed');
        navigate(`/standards/sets/${payload.setId}`);
      } else {
        toast.success('Import validated (dry run)');
      }
    } catch (e: any) {
      setError(e);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Import Standards CSV"
        subtitle="Upload a CSV, validate (dry run), then commit to create/update a set"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/standards')}>
              Back
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download size={18} />}
              onClick={() => downloadText(`template_${standardSchemaCode.toLowerCase()}.csv`, templateForSchema(standardSchemaCode))}
            >
              Download Template
            </Button>
            <Button variant="contained" startIcon={<Upload size={18} />} onClick={handleSubmit} disabled={importMutation.isPending}>
              Upload
            </Button>
          </Stack>
        }
      />

      <Stack spacing={2.5}>
        <PremiumCard
          variant="gradient"
          glow
          sx={{
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.25),
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sparkles size={18} />
                Smart Import Workspace
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Configure standards, validate quality, then commit confidently in one flow.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip icon={<ShieldCheck size={14} />} label={isCommitMode ? 'Commit Mode' : 'Dry Run Mode'} color={isCommitMode ? 'success' : 'warning'} />
              <Chip icon={<FileSpreadsheet size={14} />} label={file ? file.name : 'No CSV selected'} variant="outlined" />
            </Stack>
          </Stack>
        </PremiumCard>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2.2fr 1fr' }, gap: 2.5 }}>
          <PremiumCard title="Import Configuration" subtitle="Select schema, scope, and quality control options" accent="primary">
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }, gap: 1.5 }}>
                <TextField select label="Schema" value={standardSchemaCode} onChange={(e) => setStandardSchemaCode(e.target.value)}>
                  {(catalog?.standardSchemas || []).map((s) => (
                    <MenuItem key={s.code} value={s.code}>
                      {s.code} - {s.displayName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Species" value={speciesCode} onChange={(e) => setSpeciesCode(e.target.value)}>
                  {(catalog?.species || []).map((s) => (
                    <MenuItem key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Genetic Line" value={geneticLineCode} onChange={(e) => setGeneticLineCode(e.target.value)}>
                  <MenuItem value="">(generic)</MenuItem>
                  {(catalog?.geneticLines || []).map((l) => (
                    <MenuItem key={l.code || l.id} value={l.code || ''} disabled={!l.code}>
                      {(l.code || 'NO_CODE')} - {l.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Set Type" value={setType} onChange={(e) => setSetType(e.target.value as any)}>
                  {SET_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as any)}>
                  {SCOPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Unit" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value as any)}>
                  {UNIT_SYSTEMS.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Sex" value={sex} onChange={(e) => setSex(e.target.value as any)}>
                  {SEXES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Version" value={versionTag} onChange={(e) => setVersionTag(e.target.value)} />
                <TextField select label="Dry Run" value={dryRun} onChange={(e) => setDryRun(e.target.value)}>
                  <MenuItem value="true">true</MenuItem>
                  <MenuItem value="false">false</MenuItem>
                </TextField>
              </Box>

              <Divider />

              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: isCommitMode ? 'success.main' : 'warning.main',
                  borderRadius: 2.5,
                  p: 2,
                  background: isCommitMode
                    ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.12)} 0%, ${alpha(theme.palette.warning.main, 0.03)} 100%)`,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 700 }}>CSV Source File</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {file ? file.name : 'No file selected. Please choose a valid .csv file.'}
                    </Typography>
                  </Stack>
                  <Button variant="outlined" component="label" sx={{ minWidth: 140 }}>
                    Choose CSV
                    <input hidden type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </PremiumCard>

          <PremiumCard
            title="Execution Guide"
            subtitle="Quick checklist before upload"
            variant="glass"
            sx={{ height: 'fit-content' }}
          >
            <Stack spacing={1.25}>
              <Typography variant="body2">1. Select schema/species/genetic line to match your CSV template.</Typography>
              <Typography variant="body2">2. Keep `Dry Run = true` for validation-only preview.</Typography>
              <Typography variant="body2">3. Set `Dry Run = false` when ready to commit data.</Typography>
              <Typography variant="body2">4. Upload and review response for set creation status.</Typography>
              <Divider sx={{ my: 0.5 }} />
              <Chip
                label={isCommitMode ? 'Final commit will write to database' : 'Validation only, no database write'}
                color={isCommitMode ? 'success' : 'warning'}
                variant={isCommitMode ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </PremiumCard>
        </Box>

        {error ? (
          <ApiErrorState
            status={(error as any)?.response?.status}
            message={(error as any)?.message}
            endpoint="/api/v1/standards/imports/csv"
            correlationId={(error as any)?.response?.headers?.['x-request-id']}
          />
        ) : null}

        {result?.errors?.length ? (
          <PremiumCard title="Validation Errors" accent="error" variant="outlined">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.errors, null, 2)}</pre>
          </PremiumCard>
        ) : null}

        {Array.isArray(result?.preview) ? (
          <PremiumCard
            title="Preview"
            subtitle="Validated rows ready for commit"
            action={<Chip label={`${result.preview.length} rows`} size="small" color="info" variant="outlined" />}
          >
            <Box sx={{ height: 460 }}>
              <DataGrid
                rows={result.preview.map((r: any, idx: number) => ({ id: idx, ...r }))}
                columns={previewColumns}
                disableRowSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    fontWeight: 700,
                  },
                }}
              />
            </Box>
          </PremiumCard>
        ) : null}
      </Stack>
    </Box>
  );
};
