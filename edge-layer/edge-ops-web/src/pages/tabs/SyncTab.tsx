import { useState } from 'react';
import {
  Grid,
  Typography,
  Stack,
  Box,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  CircularProgress,
  AlertTitle,
  Tooltip
} from '@mui/material';
import {
    RefreshCw,
    Activity,
    Play,
    RotateCcw,
    CheckCircle2,
    Terminal
} from 'lucide-react';
import { usePoll } from '@/hooks/usePoll';
import { useSettings } from '@/contexts/SettingsContext';
import { edgeOpsApi, DlqEvent } from '@/api/client';
import { MetricCard } from '@/components/ui/MetricCard';
import { useMutation } from '@tanstack/react-query';
import { PremiumButton, PremiumButtonDanger } from '@/components';

// Type for the redrive API response
interface RedriveResponse {
    message?: string;
    redriven_count?: number;
}

import { classifyError, generateCurlCommand } from '@/lib/diagnostics';

export function SyncTab() {
    const { 
        tenantId, apiKey, lastRefresh, refreshInterval, getServiceUrl,
        enableDangerousActions, logAction
    } = useSettings();

    
    // UI State
    const [dlqLimit, setDlqLimit] = useState(10);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ 
        open: false, msg: '', type: 'success' 
    });

    // 1. Poll Sync State
    const { 
        data: syncState, 
        isLoading: loadingState,
        isError: errorState,
        error: syncError,
        refetch: refetchState 
    } = usePoll(
        ['sync-state', lastRefresh, tenantId],
        () => edgeOpsApi.getSyncState({ tenantId, apiKey, getServiceUrl }),
        refreshInterval
    );

    // 2. Poll DLQ List
    const { 
        data: dlqList, 
        isLoading: loadingDlq, 
        isError: errorDlq,
        refetch: refetchDlq 
    } = usePoll<DlqEvent[]>(
        ['sync-dlq', dlqLimit, lastRefresh, tenantId],
        () => edgeOpsApi.getDlq(dlqLimit, { tenantId, apiKey, getServiceUrl }),
        refreshInterval
    );

    // Mutations
    const triggerMutation = useMutation({
        mutationFn: () => edgeOpsApi.triggerSync({ tenantId, apiKey, getServiceUrl }),
        onSuccess: () => {
            showToast('Sync triggered successfully', 'success');
            logAction('Trigger Sync', 'success', 'Manual trigger initiated');
            refetchState();
        },
        onError: (err) => {
            showToast(`Trigger Failed: ${String(err)}`, 'error');
            logAction('Trigger Sync', 'failure', String(err));
        }
    });

    const redriveMutation = useMutation<RedriveResponse, Error, { eventIds?: string[]; allDlq?: boolean }>({
        mutationFn: (payload) => 
            edgeOpsApi.redriveDlq(payload, { tenantId, apiKey, getServiceUrl }) as Promise<RedriveResponse>,
        onSuccess: (data, variables) => {
            const count = data.redriven_count || 0;
            const details = variables.allDlq ? `All items (${count})` : `IDs: ${variables.eventIds?.join(', ')}`;
            showToast(data.message || `Redrived ${count} events`, 'success');
            logAction('Redrive DLQ', 'success', details);
            setConfirmOpen(false);
            refetchState();
            refetchDlq();
        },
        onError: (err) => {
            showToast(`Redrive Failed: ${String(err)}`, 'error');
            logAction('Redrive DLQ', 'failure', String(err));
        }
    });

    // Handlers
    const showToast = (msg: string, type: 'success' | 'error') => setToast({ open: true, msg, type });
    const handleCloseToast = () => setToast(prev => ({ ...prev, open: false }));
    
    const handleRedriveSingle = (id: string) => {
        redriveMutation.mutate({ eventIds: [id] });
    };

    const handleRedriveAll = () => {
        redriveMutation.mutate({ allDlq: true });
    };

    // Render Helpers
    const pending = syncState?.backlog_count || 0;
    const dlqCount = syncState?.dlq_count || 0;

    return (
        <Stack spacing={4}>
            {/* --- Section 1: State Panel --- */}
            
            {/* --- Section 1: State Panel --- */}
            
            {errorState && (
                <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetchState()}>Retry</Button>}>
                    <AlertTitle>Connection Failed</AlertTitle>
                    {(() => {
                        const diag = classifyError(syncError);
                        return (
                            <Box>
                                <Typography variant="body2">{diag.reason}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>Fix: {diag.fix}</Typography>
                            </Box>
                        );
                    })()}
                </Alert>
            )}

            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                 <Box>
                    <Typography variant="h6" fontWeight="bold">Sync Forwarder</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manages reliable data upload to the cloud.
                    </Typography>
                 </Box>
                 <Stack direction="row" spacing={1}>
                     <Tooltip title="Copy Curl (Trigger)">
                         <IconButton 
                            size="small" 
                            onClick={() => {
                                const url = `${getServiceUrl('EDGE_SYNC_FORWARDER')}/api/v1/sync/trigger`;
                                const cmd = generateCurlCommand(url, { method: 'POST', tenantId, apiKey });
                                navigator.clipboard.writeText(cmd);
                                alert('Curl command copied!');
                            }}
                         >
                            <Terminal size={16} />
                         </IconButton>
                     </Tooltip>
                     <Tooltip title={!enableDangerousActions ? "Enable 'Dangerous Actions' in Settings to use this." : ""}>
                        <span>
                            <PremiumButton
                                startIcon={triggerMutation.isPending ? <CircularProgress size={16} color="inherit"/> : <Play size={16} />}
                                onClick={() => triggerMutation.mutate()}
                                disabled={!enableDangerousActions || triggerMutation.isPending || loadingState || !!errorState}
                            >
                                Trigger Sync
                            </PremiumButton>
                        </span>
                     </Tooltip>
                 </Stack>
            </Stack>

            <Grid container spacing={3}>
                 <MetricCard 
                    title="Pending Uploads" 
                    value={pending.toLocaleString()} 
                    subValue={pending > 1000 ? "Backlog High" : "Normal"}
                    icon={<RefreshCw color="#3b82f6" />}
                    color="#3b82f6"
                    alert={pending > 5000}
                    loading={loadingState}
                />
                 <MetricCard 
                    title="Dead Letter Queue" 
                    value={dlqCount.toLocaleString()} 
                    subValue={dlqCount > 0 ? "Requires Action" : "Healthy"}
                    icon={<Activity color={dlqCount > 0 ? "#ef4444" : "#10b981"} />} 
                    color={dlqCount > 0 ? "#ef4444" : "#10b981"}
                    alert={dlqCount > 0}
                    loading={loadingState}
                />
                <Grid item xs={12} sm={6} lg={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1 }}>SYNC HEALTH</Typography>
                        <Stack spacing={2} mt={2}>
                             <Stack direction="row" justifyContent="space-between" alignItems="center">
                                 <Typography variant="body2">Last Success</Typography>
                                 <Typography variant="body2" fontWeight="medium" fontFamily="monospace">
                                     {syncState?.last_success_at ? new Date(syncState.last_success_at).toLocaleString() : '-'}
                                 </Typography>
                             </Stack>
                             <Stack direction="row" justifyContent="space-between" alignItems="center">
                                 <Typography variant="body2">Last Error</Typography>
                                 <Typography variant="body2" color="error.main" fontWeight="medium" sx={{ maxWidth: '60%', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                     {syncState?.last_error || 'None'}
                                 </Typography>
                             </Stack>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* --- Section 2: DLQ Management --- */}
            <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ color: 'text.secondary', display: 'flex' }}>
                            <Activity size={20} />
                        </Box>
                        <Typography variant="h6" fontWeight="bold">Dead Letter Queue</Typography>
                        {(dlqCount > 0 && !loadingState) && (
                            <Chip label={dlqCount} size="small" color="error" sx={{ fontWeight: 'bold' }} />
                        )}
                    </Stack>
                    
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Tooltip title="Copy Curl (Redrive All)">
                             <IconButton 
                                size="small" 
                                onClick={() => {
                                    const url = `${getServiceUrl('EDGE_SYNC_FORWARDER')}/api/v1/sync/dlq/redrive`;
                                    const cmd = generateCurlCommand(url, { method: 'POST', body: { allDlq: true }, tenantId, apiKey });
                                    navigator.clipboard.writeText(cmd);
                                    alert('Curl for Redrive All copied!');
                                }}
                             >
                                <Terminal size={16} />
                             </IconButton>
                        </Tooltip>

                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select value={dlqLimit} onChange={(e) => setDlqLimit(Number(e.target.value))}>
                                <MenuItem value={10}>Show 10</MenuItem>
                                <MenuItem value={50}>Show 50</MenuItem>
                                <MenuItem value={100}>Show 100</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title={!enableDangerousActions ? "Enable 'Dangerous Actions' in Settings to use this." : ""}>
                            <span>
                                <PremiumButtonDanger
                                    startIcon={<RotateCcw size={16} />}
                                    disabled={!enableDangerousActions || dlqCount === 0 || redriveMutation.isPending || loadingState}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    Redrive All
                                </PremiumButtonDanger>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Event ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tenant</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Attempts</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Error</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Updated</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingDlq && !dlqList ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={24} sx={{ mb: 2 }} />
                                        <Typography variant="body2" color="text.secondary">Loading DLQ items...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : errorDlq ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                         <Alert severity="error" sx={{ justifyContent: 'center' }}>
                                             Failed to load DLQ list.
                                             <Button size="small" color="inherit" onClick={() => refetchDlq()} sx={{ ml: 2 }}>Retry</Button>
                                         </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : (!dlqList || dlqList.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Stack alignItems="center" spacing={1} color="text.secondary">
                                            <CheckCircle2 size={48} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                                            <Typography variant="subtitle1" fontWeight="medium">All Clear</Typography>
                                            <Typography variant="body2">No items in the Dead Letter Queue.</Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                dlqList.map((row) => (
                                    <TableRow key={row.event_id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.event_id.substring(0, 8)}...</TableCell>
                                        <TableCell><Chip label={row.event_type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} /></TableCell>
                                        <TableCell>{row.tenant_id}</TableCell>
                                        <TableCell>{row.attempts}</TableCell>
                                        <TableCell sx={{ color: 'error.main', maxWidth: 200 }}>
                                             <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.last_error}>
                                                {row.last_error}
                                             </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(row.updated_at).toLocaleString()}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title={!enableDangerousActions ? "Enable 'Dangerous Actions' in Settings to use this." : ""}>
                                                <span>
                                                    <IconButton 
                                                        size="small" 
                                                        color="primary" 
                                                        title="Redrive Single Event"
                                                        onClick={() => handleRedriveSingle(row.event_id)}
                                                        disabled={!enableDangerousActions || redriveMutation.isPending}
                                                    >
                                                        <RotateCcw size={16} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* --- Dialogs & Toasts --- */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirm Redrive All</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to attempt to redrive <b>{dlqCount}</b> events? 
                        This operation might take some time and cause high network load.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <PremiumButtonDanger onClick={handleRedriveAll} autoFocus>
                        Redrive All
                    </PremiumButtonDanger>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseToast} severity={toast.type} sx={{ width: '100%' }} variant="filled">
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Stack>
    );
}

