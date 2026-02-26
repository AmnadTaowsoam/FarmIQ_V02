import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  alpha,
  useTheme,
  Stack
} from '@mui/material';
import { Building2, Warehouse, Building } from 'lucide-react';
import { useActiveContext } from '../../contexts/ActiveContext';
import { api, unwrapApiResponse } from '../../api';
import type { components } from '@farmiq/api-client';

type Tenant = components['schemas']['Tenant'];
type Farm = components['schemas']['Farm'];
type Barn = components['schemas']['Barn'];

export const ContextSelector: React.FC = () => {
  const theme = useTheme();
  const { 
      tenantId, farmId, barnId, 
      setTenantId, setFarmId, setBarnId 
  } = useActiveContext();
  
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);

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
      } catch (e) {
        // Silently handle errors when fetching tenants (may fail if no context yet)
        // Don't log errors - this is expected if the API is unavailable
        // Users can still use the context selector if tenantId is already set
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setFarms([]);
      setBarns([]);
      return;
    }
    const fetchFarms = async () => {
      setLoading(true);
      try {
        const response = await api.farms.list({ tenantId, page: 1, pageSize: 100 });
        const farmsResponse = unwrapApiResponse<any[]>(response) || [];
        const normalized = farmsResponse.map((farm) => ({
          ...farm,
          farm_id: farm.farm_id || (farm as any).id,
        }));
        setFarms(normalized);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFarms();
  }, [tenantId]);

  useEffect(() => {
    if (!farmId || !tenantId) {
      setBarns([]);
      return;
    }
    const fetchBarns = async () => {
      setLoading(true);
      try {
        const response = await api.barns.list({
          tenantId,
          farmId,
          page: 1,
          pageSize: 100,
        });
        const barnsResponse = unwrapApiResponse<any[]>(response) || [];
        const normalized = barnsResponse.map((barn) => ({
          ...barn,
          barn_id: barn.barn_id || (barn as any).id,
          farm_id: barn.farm_id || barn.farmId,
        }));
        const filtered = normalized.filter((barn) => (barn.farm_id || barn.farmId) === farmId);
        setBarns(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBarns();
  }, [farmId, tenantId]);

  const selectStyle = {
    height: 36,
    '& .MuiSelect-select': {
        py: 0.5,
        pl: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '0.8125rem',
        fontWeight: 700
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: alpha(theme.palette.divider, 0.5),
        borderRadius: 2
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
    },
    bgcolor: alpha(theme.palette.text.primary, 0.02)
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* Tenant */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select 
            value={tenantId || ''} 
            onChange={(e) => setTenantId(e.target.value)}
            displayEmpty
            sx={selectStyle}
        >
          <MenuItem value="" disabled>
             <Stack direction="row" spacing={1} alignItems="center">
                <Building2 size={16} />
                <Typography variant="inherit">Select Org</Typography>
             </Stack>
          </MenuItem>
          {tenants.length > 0 ? (
            tenants.map(t => (
              <MenuItem key={t.tenant_id} value={t.tenant_id}>
                  {t.name || t.tenant_id}
              </MenuItem>
            ))
          ) : tenantId ? (
            // Show current tenantId even if we couldn't fetch the list
            <MenuItem value={tenantId}>
              <Typography variant="inherit">{tenantId}</Typography>
            </MenuItem>
          ) : null}
        </Select>
      </FormControl>

      {/* Farm */}
      <FormControl size="small" sx={{ minWidth: 140 }} disabled={!tenantId || loading}>
        <Select 
            value={farmId && farms.some(f => f.farm_id === farmId) ? farmId : ''} 
            onChange={(e) => setFarmId(e.target.value || null)}
            displayEmpty
            sx={selectStyle}
        >
          <MenuItem value="">
             <Stack direction="row" spacing={1} alignItems="center">
                <Warehouse size={16} />
                <Typography variant="inherit">All Domains</Typography>
             </Stack>
          </MenuItem>
          {farms.map(f => (
            <MenuItem key={f.farm_id} value={f.farm_id}>
                {f.name || f.farm_id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Barn */}
      <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }} disabled={!farmId || loading}>
            <Select 
                value={barnId && barns.some(b => b.barn_id === barnId) ? barnId : ''} 
                onChange={(e) => setBarnId(e.target.value || null)}
                displayEmpty
                sx={selectStyle}
            >
              <MenuItem value="">
                 <Stack direction="row" spacing={1} alignItems="center">
                    <Building size={16} />
                    <Typography variant="inherit">All Segments</Typography>
                 </Stack>
              </MenuItem>
              {barns.map(b => (
                <MenuItem key={b.barn_id} value={b.barn_id}>
                    {b.name || b.barn_id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {loading && <CircularProgress size={16} thickness={5} sx={{ color: 'primary.main' }} />}
      </Stack>
    </Stack>
  );
};
