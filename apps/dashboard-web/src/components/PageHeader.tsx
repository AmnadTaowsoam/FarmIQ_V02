import React from 'react';
import { Box, Breadcrumbs, Button, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error';
  startIcon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
  actions?: Action[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  action,
  actions,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast || !crumb.href ? (
              <Typography key={String(index)} color="text.primary" variant="body2">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={String(index)}
                component={RouterLink}
                to={crumb.href}
                underline="hover"
                color="inherit"
                variant="body2"
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {(action || (actions && actions.length > 0)) && (
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {action && <Box>{action}</Box>}
            {(actions || []).map((actionItem, index) => (
              <Button
                key={index}
                variant={actionItem.variant || 'outlined'}
                color={actionItem.color || 'primary'}
                onClick={actionItem.onClick}
                startIcon={actionItem.startIcon}
              >
                {actionItem.label}
              </Button>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
