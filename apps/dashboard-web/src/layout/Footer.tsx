import React from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const Footer: React.FC = () => {
  const version = import.meta.env.VITE_APP_VERSION || '0.1.0';
  const build = import.meta.env.VITE_BUILD_ID || 'dev';
  const links = [
    { label: 'PDPA', href: '/pdpa' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Support', href: '/support' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            FarmIQ Dashboard
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {links.map((link) => (
              <Link
                key={link.label}
                component={RouterLink}
                to={link.href}
                underline="hover"
                variant="caption"
                color="text.secondary"
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Version {version} · Build {build}
        </Typography>
      </Stack>
    </Box>
  );
};
