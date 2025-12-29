import React, { useEffect } from 'react';
import { Box, Tabs, Tab, Container, Chip } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useTranslation } from 'react-i18next';

const LAST_SCOPE_KEY = 'farmiq.settings.lastScope.v1';

export const SettingsLayout: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current scope from path
  const currentScope = location.pathname.includes('/settings/workspace') 
    ? 'workspace' 
    : 'account';

  // Save last visited scope
  useEffect(() => {
    if (currentScope) {
      localStorage.setItem(LAST_SCOPE_KEY, currentScope);
    }
  }, [currentScope]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    navigate(`/settings/${newValue}`);
  };

  return (
    <Box>
      <PageHeader 
        title={t('pages.settings.title')} 
        subtitle={t('pages.settings.subtitle')}
      />

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Tabs
          value={currentScope}
          onChange={handleTabChange}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Account
                <Chip label="Personal" size="small" variant="outlined" />
              </Box>
            }
            value="account"
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Workspace
                <Chip label="Organization" size="small" variant="outlined" color="primary" />
              </Box>
            }
            value="workspace"
          />
        </Tabs>

        <Outlet />
      </Container>
    </Box>
  );
};
