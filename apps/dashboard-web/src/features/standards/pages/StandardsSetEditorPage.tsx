import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Edit, Eye } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { useAuth } from '../../../contexts/AuthContext';
import { useStandardRows, useStandardSet, useUpdateStandardSet, useUpsertStandardRows } from '../hooks/useStandards';

export const StandardsSetEditorPage: React.FC = () => {
  const { setId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'platform_admin' || r === 'tenant_admin');

  const { data: set, isLoading: setLoading, error: setError } = useStandardSet(setId);
  const [rowsRefresh, setRowsRefresh] = useState(0);
  const { data: rows, isLoading: rowsLoading, error: rowsError } = useStandardRows(setId, { refresh: rowsRefresh });
  const updateSetMutation = useUpdateStandardSet(setId);
  const upsertRowsMutation = useUpsertStandardRows(setId);

  const [name, setName] = useState('');
  const [versionTag, setVersionTag] = useState('');
  const [isActive, setIsActive] = useState(false);

  React.useEffect(() => {
    if (!set) return;
    setName(set.name);
    setVersionTag(set.versionTag);
    setIsActive(!!set.isActive);
  }, [set]);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [payloadText, setPayloadText] = useState('');
  const [payloadMode, setPayloadMode] = useState<'view' | 'edit'>('view');
  const [payloadView, setPayloadView] = useState<'table' | 'json'>('table');

  const prettyPayload = (value: unknown) => {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return '{}';
    }
  };

  const payloadFieldLabels: Record<string, string> = {
    body_weight_g: 'Body Weight (g)',
    daily_gain_g: 'Daily Gain (g)',
    avg_daily_gain_g: 'Avg Daily Gain (g)',
    daily_feed_intake_g: 'Daily Feed Intake (g)',
    cum_feed_intake_g: 'Cumulative Feed Intake (g)',
    fcr: 'FCR',
    cum_fcr: 'Cumulative FCR',
  };

  const payloadFieldOrder = [
    'body_weight_g',
    'daily_gain_g',
    'avg_daily_gain_g',
    'daily_feed_intake_g',
    'cum_feed_intake_g',
    'fcr',
    'cum_fcr',
  ];

  const formatPayloadValue = (value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
    if (typeof value === 'string') return value.length ? value : '—';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return prettyPayload(value);
  };

  const getPayloadEntries = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const ordered = [
      ...payloadFieldOrder.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !payloadFieldOrder.includes(k)).sort(),
    ];

    return ordered.map((key) => ({
      key,
      label: payloadFieldLabels[key] || key,
      value: record[key],
    }));
  };

  const getPayloadField = (row: any, key: string): unknown => {
    const payload = row?.payloadJson;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return (payload as Record<string, unknown>)[key];
  };

  const openPayload = (row: any, mode: 'view' | 'edit') => {
    setSelectedRow(row);
    setPayloadText(prettyPayload(row?.payloadJson));
    setPayloadMode(mode);
    setPayloadView('table');
    setEditOpen(true);
  };

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'dimType', headerName: 'Dim', width: 120 },
      { field: 'dimFrom', headerName: 'From', width: 100 },
      { field: 'dimTo', headerName: 'To', width: 100 },
      { field: 'phase', headerName: 'Phase', width: 160 },
      {
        field: 'body_weight_g',
        headerName: 'Body Weight (g)',
        width: 150,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'body_weight_g')),
      },
      {
        field: 'daily_gain_g',
        headerName: 'Daily Gain (g)',
        width: 150,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'daily_gain_g')),
      },
      {
        field: 'avg_daily_gain_g',
        headerName: 'Avg Daily Gain (g)',
        width: 170,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'avg_daily_gain_g')),
      },
      {
        field: 'daily_feed_intake_g',
        headerName: 'Daily Feed Intake (g)',
        width: 190,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'daily_feed_intake_g')),
      },
      {
        field: 'cum_feed_intake_g',
        headerName: 'Cumulative Feed Intake (g)',
        width: 230,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'cum_feed_intake_g')),
      },
      {
        field: 'fcr',
        headerName: 'FCR',
        width: 90,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'fcr')),
      },
      {
        field: 'cum_fcr',
        headerName: 'Cumulative FCR',
        width: 150,
        valueGetter: (_value, row) => formatPayloadValue(getPayloadField(row, 'cum_fcr')),
      },
      {
        field: 'payloadJson',
        headerName: 'Payload',
        width: 90,
        sortable: false,
        renderCell: (params) => {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="View payload">
                <IconButton size="small" onClick={() => openPayload(params.row, 'view')}>
                  <Eye size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
      { field: 'isInterpolated', headerName: 'Interpolated', width: 120, type: 'boolean' },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        renderCell: (params) =>
          isAdmin ? (
            <Button
              size="small"
              startIcon={<Edit size={16} />}
              onClick={() => {
                openPayload(params.row, 'edit');
              }}
            >
              Edit
            </Button>
          ) : null,
      },
    ],
    [isAdmin]
  );

  const handleSaveMeta = async () => {
    await updateSetMutation.mutateAsync({ name, versionTag, isActive });
  };

  const handleSaveRow = async () => {
    if (!selectedRow) return;
    const payloadJson = JSON.parse(payloadText || '{}');
    await upsertRowsMutation.mutateAsync([
      {
        rowKey: selectedRow.rowKey,
        dimType: selectedRow.dimType,
        dimFrom: selectedRow.dimFrom,
        dimTo: selectedRow.dimTo ?? undefined,
        phase: selectedRow.phase ?? undefined,
        payloadJson,
        note: selectedRow.note ?? undefined,
        isInterpolated: !!selectedRow.isInterpolated,
      },
    ]);
    setEditOpen(false);
    setRowsRefresh((x) => x + 1);
  };

  if (setError) {
    return (
      <ApiErrorState
        status={(setError as any)?.response?.status}
        message={(setError as any)?.message}
        endpoint="/api/v1/standards/sets/:setId"
        correlationId={(setError as any)?.response?.headers?.['x-request-id']}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={set?.name || 'Standard Set'}
        subtitle={
          set
            ? `${set.standardSchema?.code || set.standardSchemaId || 'SCHEMA'} • ${set.species?.code || set.speciesId} • ${set.geneticLine?.code || set.geneticLine?.name || 'GENERIC'} • ${set.setType} • ${set.unitSystem} • ${set.sex} • ${set.scope} • ${set.dayStart != null && set.dayEnd != null ? `Days ${set.dayStart}-${set.dayEnd}` : set.dayStart != null ? `Day ${set.dayStart}+` : 'All days'} • v${set.versionTag}`
            : 'Loading...'
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/standards')}>
              Back
            </Button>
            {isAdmin && (
              <Button variant="contained" startIcon={<Save size={18} />} disabled={updateSetMutation.isPending} onClick={handleSaveMeta}>
                Save
              </Button>
            )}
          </Stack>
        }
      />

      <PremiumCard>
        {setLoading ? (
          <Typography>Loading...</Typography>
        ) : !set ? (
          <Typography>Not found.</Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 320 }} disabled={!isAdmin} />
              <TextField label="Version" value={versionTag} onChange={(e) => setVersionTag(e.target.value)} sx={{ minWidth: 220 }} disabled={!isAdmin} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={!isAdmin} />
                <Typography>Active</Typography>
              </Stack>
            </Stack>

            {/* Metadata Section */}
            {(set?.sourceDocument || set?.derivedFrom || set?.adjustmentJson || set?.tenantId || set?.farmId || set?.houseId || set?.flockId) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Metadata
                </Typography>
                <Stack spacing={1.5}>
                  {set?.sourceDocument && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Source Document</Typography>
                      <Typography variant="body2">
                        {set.sourceDocument.title || 'Untitled'}
                        {set.sourceDocument.url && (
                          <Button size="small" href={set.sourceDocument.url} target="_blank" sx={{ ml: 1 }}>
                            View
                          </Button>
                        )}
                      </Typography>
                      {set.sourceDocument.doi && (
                        <Typography variant="caption" color="text.secondary">DOI: {set.sourceDocument.doi}</Typography>
                      )}
                    </Box>
                  )}
                  {set?.derivedFrom && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Derived From</Typography>
                      <Typography variant="body2">
                        {set.derivedFrom.name}
                        <Button size="small" onClick={() => navigate(`/standards/sets/${set.derivedFromSetId}`)} sx={{ ml: 1 }}>
                          View Parent
                        </Button>
                      </Typography>
                    </Box>
                  )}
                  {set?.adjustmentJson && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Adjustments</Typography>
                      <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(set.adjustmentJson, null, 2)}
                      </Typography>
                    </Box>
                  )}
                  {(set?.tenantId || set?.farmId || set?.houseId || set?.flockId) && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Context</Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {set.tenantId && <Chip label={`Tenant: ${set.tenantId}`} size="small" variant="outlined" />}
                        {set.farmId && <Chip label={`Farm: ${set.farmId}`} size="small" variant="outlined" />}
                        {set.houseId && <Chip label={`House: ${set.houseId}`} size="small" variant="outlined" />}
                        {set.flockId && <Chip label={`Flock: ${set.flockId}`} size="small" variant="outlined" />}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            {rowsError ? (
              <ApiErrorState
                status={(rowsError as any)?.response?.status}
                message={(rowsError as any)?.message}
                endpoint="/api/v1/standards/sets/:setId/rows"
                correlationId={(rowsError as any)?.response?.headers?.['x-request-id']}
                onRetry={() => setRowsRefresh((x) => x + 1)}
              />
            ) : (
              <Box sx={{ height: 560 }}>
                <DataGrid
                  rows={rows || []}
                  columns={columns}
                  loading={rowsLoading}
                  getRowId={(r) => r.id}
                  disableRowSelectionOnClick
                  getRowHeight={() => 'auto'}
                  sx={{
                    '& .MuiDataGrid-cell': {
                      py: 1,
                      alignItems: 'flex-start',
                    },
                  }}
                />
              </Box>
            )}
          </Stack>
        )}
      </PremiumCard>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{payloadMode === 'edit' ? 'Edit Row Payload' : 'Row Payload'}</DialogTitle>
        <DialogContent>
          {payloadMode === 'edit' ? (
            <TextField
              fullWidth
              multiline
              minRows={12}
              label="payloadJson"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              sx={{ mt: 1 }}
              inputProps={{
                style: {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 12,
                },
              }}
            />
          ) : (
            <Box
              sx={{
                mt: 1,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
                maxHeight: '60vh',
                overflow: 'auto',
              }}
            >
              <Tabs
                value={payloadView}
                onChange={(_e, v) => setPayloadView(v)}
                sx={{ mb: 2, minHeight: 36 }}
              >
                <Tab value="table" label="Table" sx={{ minHeight: 36 }} />
                <Tab value="json" label="JSON" sx={{ minHeight: 36 }} />
              </Tabs>

              {payloadView === 'table' ? (
                (() => {
                  const entries = getPayloadEntries(selectedRow?.payloadJson);
                  if (!entries) {
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Payload is not a flat object. Switch to JSON view.
                      </Typography>
                    );
                  }

                  return (
                    <Table size="small" sx={{ '& td, & th': { borderColor: 'divider' } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, width: 240 }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {entries.map((e) => (
                          <TableRow key={e.key}>
                            <TableCell sx={{ fontWeight: 600 }}>{e.label}</TableCell>
                            <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                              {formatPayloadValue(e.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()
              ) : (
                <Typography
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {payloadText}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          {payloadMode === 'edit' && (
            <Button variant="contained" onClick={handleSaveRow} disabled={upsertRowsMutation.isPending}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
