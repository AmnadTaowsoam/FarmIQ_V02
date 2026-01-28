import React, { useMemo, useState } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { SupportDrawer } from '../components/support/SupportDrawer';
import { ApiDiagnosticsPanel } from '../components/dev/ApiDiagnosticsPanel';

const SIDEBAR_WIDTH = 360;
const SIDEBAR_COLLAPSED_WIDTH = 88;
const SIDEBAR_STORAGE_KEY = 'farmiQ.sidebar';

export const AppShell: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'collapsed';
  });

  const sidebarWidth = useMemo(
    () => (isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH),
    [isCollapsed]
  );

  const handleSidebarToggle = () => {
    if (!isDesktop) {
      setMobileOpen((prev) => !prev);
      return;
    }
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded');
      return next;
    });
  };

  const isNarrow = useMemo(() => {
    const narrowPrefixes = ['/profile', '/settings'];
    return narrowPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Topbar
        onMenuClick={handleSidebarToggle}
        onSupportOpen={() => setSupportDrawerOpen(true)}
        isCollapsed={isCollapsed}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCollapsed={isCollapsed}
        width={sidebarWidth}
        expandedWidth={SIDEBAR_WIDTH}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarWidth}px)` },
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        <Box
          sx={{
            flex: 1,
            pt: 2,
            px: { xs: 2, sm: 3, md: 4, lg: 5 },
            width: '100%',
            maxWidth: isNarrow
              ? { xs: '100%', md: 900, lg: 1100, xl: 1280 }
              : { xs: '100%', md: 1500, lg: 1900, xl: 2200 },
            mx: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Box>
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4, lg: 5 },
            width: '100%',
            maxWidth: isNarrow
              ? { xs: '100%', md: 900, lg: 1100, xl: 1280 }
              : { xs: '100%', md: 1500, lg: 1900, xl: 2200 },
            mx: 'auto',
            mt: 'auto',
          }}
        >
          {import.meta.env.VITE_DEBUG_TOOLS === '1' ? <ApiDiagnosticsPanel /> : null}
          <Footer />
        </Box>
      </Box>

      <SupportDrawer open={supportDrawerOpen} onClose={() => setSupportDrawerOpen(false)} />
    </Box>
  );
};
