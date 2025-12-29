import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, Avatar, TextField, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { Building2, ArrowRight } from 'lucide-react';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { LoadingCard } from '../../../components/LoadingCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import type { components } from '@farmiq/api-client';

type Tenant = components['schemas']['Tenant'];

export const TenantSelectionPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { setTenantId } = useActiveContext();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [overrideTenantId, setOverrideTenantId] = useState<string>(
        import.meta.env.VITE_DEFAULT_TENANT_ID || ''
    );
    const isDev = import.meta.env.DEV;

    const handleSelect = (tenantId: string) => {
        setTenantId(tenantId);
        navigate('/select-farm');
    };

    useEffect(() => {
        const fetchTenants = async () => {
            setLoading(true);
            try {
                const response = await api.tenants.list();
                const tenantsResponse = unwrapApiResponse<any[]>(response) || [];
                const normalized = tenantsResponse.map((tenant) => ({
                    ...tenant,
                    tenant_id: tenant.tenant_id || (tenant as any).id,
                }));
                setTenants(normalized);
                setError(null);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, []);

    if (loading) {
        return (
            <Box>
                <PageHeader title="Select Organization" subtitle="Choose the tenant organization you wish to manage" />
                <LoadingCard title="Loading tenants" lines={3} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <PageHeader title="Select Organization" subtitle="Choose the tenant organization you wish to manage" />
                <ErrorState title="Failed to load tenants" message={error.message} />
                {isDev ? (
                    <PremiumCard sx={{ mt: 3 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            Developer override
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            The tenant service is unavailable. Enter a tenant ID to continue in dev mode.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                            <TextField
                                label="Developer tenant ID"
                                value={overrideTenantId}
                                onChange={(event) => setOverrideTenantId(event.target.value)}
                                placeholder="tenant-id"
                                fullWidth
                            />
                            <Button
                                variant="contained"
                                onClick={() => {
                                    if (!overrideTenantId.trim()) return;
                                    handleSelect(overrideTenantId.trim());
                                }}
                                sx={{ minWidth: 180 }}
                            >
                                Use this tenantId
                            </Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Tip: set `VITE_DEFAULT_TENANT_ID` to auto-apply on load.
                        </Typography>
                    </PremiumCard>
                ) : null}
            </Box>
        );
    }

    if (!tenants.length) {
        return (
            <Box>
                <PageHeader title="Select Organization" subtitle="Choose the tenant organization you wish to manage" />
                <EmptyState
                    title="No tenants available"
                    description="Your account is not linked to any tenant workspace yet."
                />
            </Box>
        );
    }

    return (
        <Box>
            <PageHeader title="Select Organization" subtitle="Choose the tenant organization you wish to manage" />

            <Grid container spacing={4} sx={{ animation: 'fadeIn 0.6s ease-out' }}>
                {tenants.map((tenant) => {
                    const tenantId = tenant.tenant_id || '';
                    return (
                        <Grid item xs={12} sm={6} md={4} key={tenantId || tenant.name}>
                            <PremiumCard
                                hoverable
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    p: 4,
                                }}
                                onClick={() => tenantId && handleSelect(tenantId)}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <Avatar
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                            mb: 3,
                                            border: '2px solid',
                                            borderColor: alpha(theme.palette.primary.main, 0.2),
                                        }}
                                    >
                                        <Building2 size={40} />
                                    </Avatar>
                                    <Typography variant="h5" fontWeight="700" gutterBottom>
                                        {tenant.name || tenant.tenant_id}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        Enterprise agricultural management workspace
                                    </Typography>
                                    <Button variant="outlined" endIcon={<ArrowRight size={16} />} sx={{ borderRadius: 10, px: 3 }}>
                                        Enter Workspace
                                    </Button>
                                </Box>
                            </PremiumCard>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};
