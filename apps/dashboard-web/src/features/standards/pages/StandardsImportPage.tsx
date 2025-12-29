import React, { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Download } from 'lucide-react';
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

      <PremiumCard>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <TextField select label="Schema" value={standardSchemaCode} onChange={(e) => setStandardSchemaCode(e.target.value)} sx={{ minWidth: 260 }}>
              {(catalog?.standardSchemas || []).map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} - {s.displayName}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Species" value={speciesCode} onChange={(e) => setSpeciesCode(e.target.value)} sx={{ minWidth: 220 }}>
              {(catalog?.species || []).map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Genetic Line" value={geneticLineCode} onChange={(e) => setGeneticLineCode(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">(generic)</MenuItem>
              {(catalog?.geneticLines || []).map((l) => (
                <MenuItem key={l.code || l.id} value={l.code || ''} disabled={!l.code}>
                  {(l.code || 'NO_CODE')} - {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Set Type" value={setType} onChange={(e) => setSetType(e.target.value as any)} sx={{ minWidth: 200 }}>
              {SET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as any)} sx={{ minWidth: 180 }}>
              {SCOPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Unit" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value as any)} sx={{ minWidth: 160 }}>
              {UNIT_SYSTEMS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Sex" value={sex} onChange={(e) => setSex(e.target.value as any)} sx={{ minWidth: 180 }}>
              {SEXES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Version" value={versionTag} onChange={(e) => setVersionTag(e.target.value)} sx={{ minWidth: 160 }} />
            <TextField select label="Dry Run" value={dryRun} onChange={(e) => setDryRun(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="true">true</MenuItem>
              <MenuItem value="false">false</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" component="label">
              Choose CSV
              <input hidden type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Button>
            <Typography color="text.secondary">{file ? file.name : 'No file selected'}</Typography>
          </Stack>

          {error ? (
            <ApiErrorState
              status={(error as any)?.response?.status}
              message={(error as any)?.message}
              endpoint="/api/v1/standards/imports/csv"
              correlationId={(error as any)?.response?.headers?.['x-request-id']}
            />
          ) : null}

          {result?.errors?.length ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Validation Errors
              </Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.errors, null, 2)}</pre>
            </Box>
          ) : null}

          {Array.isArray(result?.preview) ? (
            <Box sx={{ height: 420 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Preview
              </Typography>
              <DataGrid rows={result.preview.map((r: any, idx: number) => ({ id: idx, ...r }))} columns={previewColumns} disableRowSelectionOnClick />
            </Box>
          ) : null}
        </Stack>
      </PremiumCard>
    </Box>
  );
};
