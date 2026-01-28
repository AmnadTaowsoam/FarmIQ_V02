
import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
  Grid,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  ClipboardCopy,
  Download,
  CheckCircle2,
  Camera,
  FileText
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { edgeOpsApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { PremiumCard, PremiumButton, PremiumButtonOutline } from '@/components';

export function EvidenceTab() {
    const settings = useSettings();
    const { getServiceUrl, tenantId, apiKey } = settings;
    const [diagLoading, setDiagLoading] = useState(false);

    // Manual Checklist State
    const [checklist, setChecklist] = useState({
        overview: false,
        ingress: false,
        sync: false,
        settings: false
    });

    // Fetch basic status for summary text
    const { data: edgeStatus } = useQuery({
        queryKey: ['edge-status-evidence', tenantId],
        queryFn: () => edgeOpsApi.getStatus({ tenantId, apiKey, getServiceUrl }),
        enabled: false // Lazy fetch or rely on cache? Let's just rely on cache or fetch fresh if needed for summary
    });

    const handleToggle = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleExportDiagnostics = async () => {
        setDiagLoading(true);
        try {
            const bundle = await edgeOpsApi.getDiagnosticsBundle(settings, { tenantId, apiKey, getServiceUrl });
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edge-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Failed to export diagnostics: ' + e);
        } finally {
            setDiagLoading(false);
        }
    };

    const handleCopySupportSummary = async () => {
        // Simple summary generation
        const lines = [
            `[Support Summary]`,
            `Time: ${new Date().toISOString()}`,
            `Tenant: ${tenantId}`,
            `Health: ${edgeStatus?.health?.status || 'UNKNOWN'}`,
            `Version: ${edgeStatus?.health?.version || 'UNKNOWN'}`,
            `Sync Backlog: ${edgeStatus?.sync?.pendingCount ?? '?'}`,
            `DLQ Count: ${edgeStatus?.sync?.dlqCount ?? '?'}`
        ];
        
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            alert('Summary copied to clipboard!');
        } catch (e) {
            alert('Failed to copy to clipboard');
        }
    };

    const allChecked = Object.values(checklist).every(Boolean);

    return (
        <Stack spacing={4}>
            {/* Header */}
            <Box>
                <Typography variant="h5" fontWeight="bold">Evidence Collection</Typography>
                <Typography variant="body2" color="text.secondary">
                    Use this page to gather information for support tickets.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* 1. Automated Actions */}
                <Grid item xs={12} md={6}>
                    <PremiumCard sx={{ p: 3, height: '100%' }}>
                        <Stack spacing={3}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <FileText size={20} />
                                <Typography variant="h6" fontWeight="bold">Automated Collection</Typography>
                            </Stack>
                            <Divider />
                            
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>1. Export Diagnostics</Typography>
                                <Typography variant="caption" color="text.secondary" paragraph>
                                    Downloads a complete JSON bundle including system info, service status, and recent logs.
                                </Typography>
                                <PremiumButton
                                    fullWidth
                                    startIcon={diagLoading ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
                                    onClick={handleExportDiagnostics}
                                    disabled={diagLoading}
                                >
                                    {diagLoading ? 'Generating Bundle...' : 'Download Diagnostics Bundle'}
                                </PremiumButton>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>2. Support Summary</Typography>
                                <Typography variant="caption" color="text.secondary" paragraph>
                                    Copies a short text summary of the current system state to your clipboard.
                                </Typography>
                                <PremiumButtonOutline
                                    fullWidth
                                    startIcon={<ClipboardCopy size={16} />}
                                    onClick={handleCopySupportSummary}
                                >
                                    Copy Summary Text
                                </PremiumButtonOutline>
                            </Box>
                        </Stack>
                    </PremiumCard>
                </Grid>

                {/* 2. Manual Checklist */}
                <Grid item xs={12} md={6}>
                    <PremiumCard sx={{ p: 3, height: '100%' }}>
                         <Stack spacing={3}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Camera size={20} />
                                <Typography variant="h6" fontWeight="bold">Screenshot Checklist</Typography>
                            </Stack>
                            <Divider />
                            
                            <Alert severity="info" sx={{ py: 0 }}>
                                Please capture screenshots of the following screens if the "Diagnostics Bundle" is unavailable.
                            </Alert>

                            <Stack>
                                <FormControlLabel
                                    control={<Checkbox checked={checklist.overview} onChange={() => handleToggle('overview')} />}
                                    label="Overview Tab (System KPIs & Services)"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={checklist.ingress} onChange={() => handleToggle('ingress')} />}
                                    label="Ingress Tab (Traffic & Errors)"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={checklist.sync} onChange={() => handleToggle('sync')} />}
                                    label="Sync Tab (Health & DLQ)"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={checklist.settings} onChange={() => handleToggle('settings')} />}
                                    label="Settings Drawer (Connection Profile)"
                                />
                            </Stack>

                            {allChecked && (
                                <Alert severity="success" icon={<CheckCircle2 />}>
                                    Checklist complete! Ready to submit.
                                </Alert>
                            )}
                        </Stack>
                    </PremiumCard>
                </Grid>
            </Grid>
        </Stack>
    );
}
