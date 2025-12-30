import React, { useState } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Toolbar, 
  Typography, 
  IconButton, 
  FormControl, 
  Select, 
  MenuItem,
  InputLabel,
  Stack,
  Button,
  Tab,
  Tabs
} from '@mui/material';
import { 
  LayoutDashboard, 
  RefreshCw, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { SettingsDrawer } from '@/components/settings/SettingsDrawer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { 
    tenantId, 
    setTenantId, 
    refreshInterval, 
    setRefreshInterval, 
    triggerRefresh 
  } = useSettings();
  
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Determine active tab
  const currentTab = location.pathname.startsWith('/edge-ops') ? '/edge-ops' : '/dashboard';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="sticky">
        <Toolbar>
          {/* Logo / Title */}
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mr: 4 }}>
            <Box 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'primary.contrastText', 
                p: 0.8, 
                borderRadius: 1, 
                display: 'flex' 
              }}
            >
              <LayoutDashboard size={24} />
            </Box>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                FarmIQ Edge Ops
              </Typography>
            </Box>
          </Stack>

          {/* Navigation Tabs */}
          <Tabs 
            value={currentTab} 
            textColor="inherit" 
            indicatorColor="secondary"
            sx={{ flexGrow: 1 }}
          >
            <Tab label="Service Registry" value="/edge-ops" component={Link} to="/edge-ops" />
            <Tab label="System Status" value="/dashboard" component={Link} to="/dashboard" />
          </Tabs>

          {/* Controls */}
          <Stack direction="row" spacing={2} alignItems="center">
            
            {/* Tenant Selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tenant</InputLabel>
              <Select
                value={tenantId}
                label="Tenant"
                onChange={(e) => setTenantId(e.target.value)}
              >
                <MenuItem value="t-001">t-001 (Default)</MenuItem>
                <MenuItem value="t-demo">t-demo</MenuItem>
                <MenuItem value="t-prod">t-prod</MenuItem>
              </Select>
            </FormControl>

            {/* Refresh Interval */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Refresh Rate</InputLabel>
              <Select
                value={refreshInterval}
                label="Refresh Rate"
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <MenuItem value={2000}>2s (Fast)</MenuItem>
                <MenuItem value={5000}>5s (Normal)</MenuItem>
                <MenuItem value={15000}>15s (Slow)</MenuItem>
                <MenuItem value={0}>Manual Only</MenuItem>
              </Select>
            </FormControl>

            {/* Manual Refresh */}
            <Button 
              variant="outlined" 
              color="inherit" 
              startIcon={<RefreshCw size={16} />}
              onClick={triggerRefresh}
              sx={{ borderColor: 'divider', '&:hover': { borderColor: 'text.primary' } }}
            >
              Refresh
            </Button>
            
            <IconButton 
              color="inherit" 
              title="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon size={20} />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, maxWidth: '1600px', mx: 'auto', width: '100%' }}>
        {children}
      </Box>

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
