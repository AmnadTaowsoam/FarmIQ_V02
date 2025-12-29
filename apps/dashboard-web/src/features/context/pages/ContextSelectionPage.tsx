import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Stepper, 
    Step, 
    StepLabel, 
    Grid, 
    alpha, 
    useTheme, 
    CircularProgress,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Skeleton,
    TextField
} from '@mui/material';
import { useDelayedLoading } from '../../../hooks/useDelayedLoading';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    Building2, 
    Warehouse, 
    Building, 
    ArrowRight, 
    ChevronLeft, 
    History,
    CheckCircle2,
    Copy,
    Trash2
} from 'lucide-react';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api, unwrapApiResponse } from '../../../api';
import { queryKeys, DEFAULT_STALE_TIME } from '../../../services/queryKeys';
import type { components } from '@farmiq/api-client';

type Tenant = components['schemas']['Tenant'];
type Farm = components['schemas']['Farm'];
type Barn = components['schemas']['Barn'];

interface RecentContext {
    tenantId: string;
    tenantName: string;
    farmId?: string;
    farmName?: string;
    barnId?: string;
    barnName?: string;
}

const STEPS = ['Organization', 'Farm Domain', 'Barn Segment'];

// Developer Override Panel Component
const DevOverridePanel: React.FC<{ from: string }> = ({ from }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { setTenantId, setFarmId, setBarnId, setSpecies, setTimeRangePreset } = useActiveContext();
    
    // Load from localStorage or env vars
    const loadDefaults = () => {
        try {
            const stored = localStorage.getItem('farmiq_active_context');
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    tenantId: parsed.tenantId || '',
                    farmId: parsed.farmId || '',
                    barnId: parsed.barnId || '',
                    species: parsed.species || '',
                    preset: parsed.timeRange?.preset || '7d'
                };
            }
        } catch (e) {
            console.error('Failed to load context from localStorage', e);
        }
        
        return {
            tenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || '',
            farmId: import.meta.env.VITE_DEFAULT_FARM_ID || '',
            barnId: import.meta.env.VITE_DEFAULT_BARN_ID || '',
            species: import.meta.env.VITE_DEFAULT_SPECIES || '',
            preset: import.meta.env.VITE_DEFAULT_PRESET || '7d'
        };
    };
    
    const [devTenantId, setDevTenantId] = useState(loadDefaults().tenantId);
    const [devFarmId, setDevFarmId] = useState(loadDefaults().farmId);
    const [devBarnId, setDevBarnId] = useState(loadDefaults().barnId);
    const [devSpecies, setDevSpecies] = useState(loadDefaults().species);
    const [devPreset, setDevPreset] = useState<'24h' | '7d' | '30d' | '90d'>(loadDefaults().preset as any);
    const [copySuccess, setCopySuccess] = useState(false);
    
    const handleApplyContext = () => {
        if (!devTenantId.trim()) return;
        
        setTenantId(devTenantId.trim());
        setFarmId(devFarmId.trim() || null);
        setBarnId(devBarnId.trim() || null);
        setSpecies(devSpecies.trim() || null);
        setTimeRangePreset(devPreset);
        
        navigate(from, { replace: true });
    };
    
    const handleClearContext = () => {
        localStorage.removeItem('farmiq_active_context');
        setDevTenantId('');
        setDevFarmId('');
        setDevBarnId('');
        setDevSpecies('');
        setDevPreset('7d');
    };
    
    const handleCopyJSON = async () => {
        const context = {
            tenantId: devTenantId.trim() || null,
            farmId: devFarmId.trim() || null,
            barnId: devBarnId.trim() || null,
            species: devSpecies.trim() || null,
            timeRange: { preset: devPreset }
        };
        
        try {
            await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (e) {
            console.error('Failed to copy to clipboard', e);
        }
    };
    
    return (
        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.2), mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="800" gutterBottom color="warning.main">
                Developer Override
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Bypass context selection with custom values. Defaults from localStorage or env vars.
            </Typography>
            
            <Stack spacing={2}>
                <TextField
                    label="Tenant ID"
                    value={devTenantId}
                    onChange={(e) => setDevTenantId(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="e.g., test-tenant"
                />
                <TextField
                    label="Farm ID"
                    value={devFarmId}
                    onChange={(e) => setDevFarmId(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="e.g., test-farm"
                />
                <TextField
                    label="Barn ID"
                    value={devBarnId}
                    onChange={(e) => setDevBarnId(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="e.g., test-barn"
                />
                <TextField
                    label="Species"
                    value={devSpecies}
                    onChange={(e) => setDevSpecies(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="e.g., pig, chicken"
                />
                <FormControl size="small" fullWidth>
                    <InputLabel>Time Range Preset</InputLabel>
                    <Select
                        value={devPreset}
                        onChange={(e) => setDevPreset(e.target.value as any)}
                        label="Time Range Preset"
                    >
                        <MenuItem value="24h">Last 24 Hours</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="90d">Last 90 Days</MenuItem>
                    </Select>
                </FormControl>
                
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        fullWidth
                        sx={{ fontWeight: 700 }}
                        onClick={handleApplyContext}
                        disabled={!devTenantId.trim()}
                    >
                        Apply Context
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={handleClearContext}
                        startIcon={<Trash2 size={16} />}
                    >
                        Clear
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={handleCopyJSON}
                        startIcon={<Copy size={16} />}
                    >
                        {copySuccess ? '✓' : 'Copy'}
                    </Button>
                </Stack>
                
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Tip: Set VITE_DEFAULT_* env vars to auto-populate fields
                </Typography>
            </Stack>
        </Box>
    );
};


export const ContextSelectionPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Intended destination after selection
    const from = (location.state as any)?.from?.pathname || '/overview';

    const { 
        tenantId, farmId, barnId, 
        setTenantId, setFarmId, setBarnId 
    } = useActiveContext();

    const [activeStep, setActiveStep] = useState(0);
    const [recentContexts, setRecentContexts] = useState<RecentContext[]>([]);
    
    // Fetch tenants with React Query
    const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery({
        queryKey: queryKeys.tenants.all,
        queryFn: async () => {
            const response = await api.tenants.list();
            const tenantsResponse = unwrapApiResponse<any[]>(response) || [];
            return tenantsResponse.map((tenant) => ({
                ...tenant,
                tenant_id: tenant.tenant_id || (tenant as any).id,
            }));
        },
        staleTime: DEFAULT_STALE_TIME,
        retry: false, // Don't retry on error for tenant list (may fail without context)
        refetchOnWindowFocus: false, // Don't refetch on window focus
    });
    
    // Fetch farms with React Query (enabled when tenantId is selected)
    const { data: farms = [], isLoading: farmsLoading, error: farmsError } = useQuery({
        queryKey: queryKeys.farms.byTenant(tenantId || ''),
        queryFn: async () => {
            if (!tenantId) return [];
            const response = await api.farms.list({ tenantId, page: 1, pageSize: 100 });
            const farmsResponse = unwrapApiResponse<any[]>(response) || [];
            return farmsResponse.map((farm) => ({
                ...farm,
                farm_id: farm.farm_id || (farm as any).id,
            }));
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
    });
    
    // Fetch barns with React Query (enabled when farmId is selected)
    const { data: barns = [], isLoading: barnsLoading, error: barnsError } = useQuery({
        queryKey: queryKeys.barns.byFarm(farmId || ''),
        queryFn: async () => {
            if (!tenantId || !farmId) return [];
            const response = await api.barns.list({ tenantId, farmId, page: 1, pageSize: 100 });
            const barnsResponse = unwrapApiResponse<any[]>(response) || [];
            return barnsResponse.map((barn) => ({
                ...barn,
                barn_id: barn.barn_id || (barn as any).id,
            }));
        },
        enabled: !!tenantId && !!farmId,
        staleTime: DEFAULT_STALE_TIME,
    });
    
    const loading = tenantsLoading || farmsLoading || barnsLoading;
    const showSkeleton = useDelayedLoading(loading);

    // Determine current step based on selected IDs if navigating back
    useEffect(() => {
        if (tenantId) {
            if (farmId) {
                if (barnId) setActiveStep(2);
                else setActiveStep(1);
            } else setActiveStep(1);
        }
    }, []);

    // Load recent contexts from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('farmiq_recent_contexts');
        if (stored) {
            try {
                setRecentContexts(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse recent contexts', e);
            }
        }
    }, []);


    const handleBack = () => {
        if (activeStep > 0) setActiveStep(prev => prev - 1);
    };

    const handleNext = () => {
        if (activeStep < 2) setActiveStep(prev => prev + 1);
        else handleFinish();
    };

    const handleFinish = () => {
        const tenantName = tenants.find(t => t.tenant_id === tenantId)?.name || tenantId || 'Organization';
        const farmName = farms.find(f => f.farm_id === farmId)?.name || farmId || 'Farm';
        const barnName = barns.find(b => b.barn_id === barnId)?.name || barnId || 'Barn';

        const newRecent: RecentContext = {
            tenantId: tenantId!,
            tenantName,
            farmId: farmId || undefined,
            farmName: farmId ? farmName : undefined,
            barnId: barnId || undefined,
            barnName: barnId ? barnName : undefined
        };

        const existing = recentContexts.filter(c => c.tenantId !== newRecent.tenantId || c.farmId !== newRecent.farmId || c.barnId !== newRecent.barnId);
        const updated = [newRecent, ...existing].slice(0, 4);
        localStorage.setItem('farmiQ.recentContexts', JSON.stringify(updated));
        
        navigate(from, { replace: true });
    };

    const handleQuickPick = (item: RecentContext) => {
        setTenantId(item.tenantId);
        setFarmId(item.farmId || null);
        setBarnId(item.barnId || null);
        navigate(from, { replace: true });
    };

    const canContinue = () => {
        if (activeStep === 0) return !!tenantId;
        if (activeStep === 1) return true; // Domain is optional in some flows, but usually recommended
        return true;
    };

    const renderHeader = () => (
        <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="800" gutterBottom letterSpacing={-1}>
                Welcome to FarmIQ
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Select your work context to begin monitoring and managing your operations.
            </Typography>
        </Box>
    );

    const renderRecent = () => {
        if (recentContexts.length === 0 && !showSkeleton) return null;
        return (
            <Box sx={{ mb: 6 }}>
                <Typography variant="caption" fontWeight="800" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1.2, mb: 2, display: 'block' }}>
                    Jump Back In
                </Typography>
                {showSkeleton ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[1, 2].map(i => (
                            <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 3 }} />
                        ))}
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {recentContexts.map((item, i) => (
                            <Grid item xs={12} sm={6} key={i}>
                                <Box 
                                    onClick={() => handleQuickPick(item)}
                                    sx={{ 
                                        p: 2, 
                                        borderRadius: 3, 
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        border: '1px solid',
                                        borderColor: alpha(theme.palette.primary.main, 0.1),
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            transform: 'translateY(-2px)',
                                            borderColor: 'primary.main'
                                        }
                                    }}
                                >
                                    <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 2, color: 'primary.contrastText' }}>
                                        <History size={16} />
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight="700" noWrap>
                                            {item.farmName || item.tenantName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ opacity: 0.7 }}>
                                            {item.barnName || 'Overview'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        );
    };

    return (
        <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', py: 8 }}>
            <Stack spacing={4} sx={{ width: '100%', maxWidth: 840, mx: 'auto' }}>
                {renderHeader()}
                
                <PremiumCard accent="primary" sx={{ p: { xs: 3, md: 5 }, overflow: 'visible' }}>
                    <Stepper activeStep={activeStep} sx={{ mb: 8 }}>
                        {STEPS.map((label) => (
                            <Step key={label}>
                                <StepLabel>
                                    <Typography variant="caption" fontWeight="700">{label}</Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Grid container spacing={5}>
                        <Grid item xs={12} md={7}>
                            <Box sx={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
                                {showSkeleton ? (
                                    <Box>
                                        <Skeleton variant="text" width="40%" height={32} sx={{ mb: 1 }} />
                                        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 4 }} />
                                        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 2 }} />
                                        <Skeleton variant="text" width="50%" height={16} />
                                    </Box>
                                ) : (
                                    <React.Fragment>
                                        {activeStep === 0 && (
                                            <Box>
                                                <Typography variant="h6" fontWeight="800" gutterBottom>Organization Selection</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                                    Select the parent organization you wish to access. This defines your primary data scope.
                                                </Typography>
                                                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                                                    <InputLabel>Organization</InputLabel>
                                                    <Select
                                                        value={tenantId || ''}
                                                        onChange={(e) => {
                                                            setTenantId(e.target.value as string);
                                                            setFarmId(null);
                                                            setBarnId(null);
                                                        }}
                                                        label="Organization"
                                                        startAdornment={<Building2 size={20} style={{ marginRight: 12, opacity: 0.5 }} />}
                                                    >
                                                        {tenants.map(t => (
                                                            <MenuItem key={t.tenant_id} value={t.tenant_id}>
                                                                {t.name || t.tenant_id}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    <FormHelperText>Required to proceed to farm selection.</FormHelperText>
                                                </FormControl>
                                            </Box>
                                        )}

                                        {activeStep === 1 && (
                                            <Box>
                                                <Typography variant="h6" fontWeight="800" gutterBottom>Farm Domain</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                                    Choose a specific production site or farm domain. You can also view all domains.
                                                </Typography>
                                                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                                                    <InputLabel>Farm Domain</InputLabel>
                                                    <Select
                                                        value={farmId || ''}
                                                        onChange={(e) => {
                                                            setFarmId(e.target.value as string || null);
                                                            setBarnId(null);
                                                        }}
                                                        label="Farm Domain"
                                                        startAdornment={<Warehouse size={20} style={{ marginRight: 12, opacity: 0.5 }} />}
                                                    >
                                                        <MenuItem value=""><em>All Domains (Dashboard)</em></MenuItem>
                                                        {farms.map(f => (
                                                            <MenuItem key={f.farm_id} value={f.farm_id}>
                                                                {f.name || f.farm_id}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    <FormHelperText>Optional. Leave empty for organization overview.</FormHelperText>
                                                </FormControl>
                                            </Box>
                                        )}

                                        {activeStep === 2 && (
                                            <Box>
                                                <Typography variant="h6" fontWeight="800" gutterBottom>Barn Segment</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                                    Focus on a specific barn or enclosure for granular telemetry and batch insights.
                                                </Typography>
                                                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                                                    <InputLabel>Barn Segment</InputLabel>
                                                    <Select
                                                        value={barnId || ''}
                                                        onChange={(e) => setBarnId(e.target.value as string || null)}
                                                        label="Barn Segment"
                                                        startAdornment={<Building size={20} style={{ marginRight: 12, opacity: 0.5 }} />}
                                                        disabled={!farmId}
                                                    >
                                                        <MenuItem value=""><em>All Segments (Farm Overview)</em></MenuItem>
                                                        {barns.map(b => (
                                                            <MenuItem key={b.barn_id} value={b.barn_id}>
                                                                {b.name || b.barn_id}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {!farmId && <FormHelperText error>Select a farm first to see specific barns.</FormHelperText>}
                                                </FormControl>
                                            </Box>
                                        )}
                                    </React.Fragment>
                                )}

                                <Box sx={{ mt: 'auto', pt: 4, display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Button 
                                        onClick={handleBack} 
                                        disabled={activeStep === 0}
                                        startIcon={<ChevronLeft size={18} />}
                                        sx={{ fontWeight: 700 }}
                                    >
                                        Back
                                    </Button>
                                    
                                    <Stack direction="row" spacing={2}>
                                        {activeStep === 0 && !tenantId && (
                                            <Typography variant="caption" color="warning.main" fontWeight="700" sx={{ alignSelf: 'center' }}>
                                                Select organization to continue
                                            </Typography>
                                        )}
                                        <Button 
                                            variant="contained" 
                                            size="large"
                                            onClick={handleNext}
                                            disabled={!canContinue() || loading}
                                            endIcon={activeStep === 2 ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                                            sx={{ 
                                                px: 4, 
                                                py: 1.2, 
                                                borderRadius: 2,
                                                fontWeight: 800,
                                                boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.3)}`
                                            }}
                                        >
                                            {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 
                                             activeStep === 2 ? 'Launch Platform' : 'Continue'}
                                        </Button>
                                    </Stack>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Box sx={{ height: '100%', borderLeft: { md: '1px solid' }, borderColor: 'divider', pl: { md: 4 } }}>
                                {renderRecent()}
                                
                                {import.meta.env.DEV && (
                    <DevOverridePanel from={from} />
                )}
                                
                                <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" fontWeight="800" gutterBottom>Need Assistance?</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Workspace access is controlled by your site administrator.
                                    </Typography>
                                    <Button size="small" variant="text" color="primary" sx={{ fontWeight: 700, p: 0 }}>
                                        Contact IT Support
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </PremiumCard>
                
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" fontWeight="600">
                        Secure Environment &bull; Enterprise Protocol v1.2 &bull; FarmIQ Platform
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
};
