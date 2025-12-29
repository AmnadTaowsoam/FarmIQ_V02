import React from 'react';
import { Box, Typography, Button, Breadcrumbs, Link, Stack, alpha, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'info';
  startIcon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: Action;
  secondaryActions?: Action[];
  // Compatibility props (for older code)
  action?: React.ReactNode;
  actions?: Action[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  action,
  actions,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 5 }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
            separator={<ChevronRight size={14} />} 
            aria-label="breadcrumb" 
            sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { mx: 1, opacity: 0.6 } }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast || !crumb.href ? (
              <Typography 
                key={String(index)} 
                variant="caption" 
                fontWeight="700"
                color={isLast ? "text.primary" : "text.secondary"}
                sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={String(index)}
                component={RouterLink}
                to={crumb.href}
                underline="none"
                color="inherit"
                variant="caption"
                fontWeight="700"
                sx={{ 
                    textTransform: 'uppercase', 
                    letterSpacing: 1,
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
        spacing={3}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
                fontWeight: 800, 
                letterSpacing: -1,
                mb: 0.5,
                color: 'text.primary'
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, maxWidth: 800 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Actions Area */}
        {(primaryAction || secondaryActions || action || (actions && actions.length > 0)) && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Legacy compatibility */}
            {action && <Box>{action}</Box>}
            {(actions || []).map((a, i) => (
              <Button
                key={i}
                variant={a.variant || 'outlined'}
                color={a.color || 'primary'}
                onClick={a.onClick}
                startIcon={a.startIcon}
                sx={{ h: 42, px: 2.5 }}
              >
                {a.label}
              </Button>
            ))}

            {/* Modern Action API */}
            {secondaryActions?.map((a, i) => (
                <Button
                    key={i}
                    variant={a.variant || 'text'}
                    color={a.color || 'inherit' as any}
                    onClick={a.onClick}
                    startIcon={a.startIcon}
                    sx={{ height: 42, px: 2.5 }}
                >
                    {a.label}
                </Button>
            ))}
            
            {primaryAction && (
                <Button
                    variant={primaryAction.variant || 'contained'}
                    color={primaryAction.color || 'primary'}
                    onClick={primaryAction.onClick}
                    startIcon={primaryAction.startIcon}
                    sx={{ 
                        height: 42, 
                        px: 3,
                        boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                >
                    {primaryAction.label}
                </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
