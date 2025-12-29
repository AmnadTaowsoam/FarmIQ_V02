import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Shield, Users } from 'lucide-react';
import { StatusPill } from '../../../components/admin/StatusPill';

export const RolesPage: React.FC = () => {
  // Mock roles data
  const roles = [
    {
      id: '1',
      name: 'Super Administrator',
      key: 'SUPER_ADMIN',
      description: 'Full system access with all permissions',
      userCount: 3,
      permissions: 29,
      color: 'error' as const,
    },
    {
      id: '2',
      name: 'Tenant Administrator',
      key: 'TENANT_ADMIN',
      description: 'Tenant-scoped management and configuration',
      userCount: 12,
      permissions: 18,
      color: 'primary' as const,
    },
    {
      id: '3',
      name: 'Operations Administrator',
      key: 'OPS_ADMIN',
      description: 'Operations and infrastructure management',
      userCount: 5,
      permissions: 12,
      color: 'warning' as const,
    },
    {
      id: '4',
      name: 'Auditor',
      key: 'AUDITOR',
      description: 'Audit log and compliance access',
      userCount: 8,
      permissions: 4,
      color: 'info' as const,
    },
    {
      id: '5',
      name: 'Support Engineer',
      key: 'SUPPORT',
      description: 'Support tools and debugging access',
      userCount: 6,
      permissions: 8,
      color: 'success' as const,
    },
    {
      id: '6',
      name: 'Read-Only User',
      key: 'READ_ONLY',
      description: 'View-only access to all resources',
      userCount: 24,
      permissions: 6,
      color: 'default' as const,
    },
  ];

  const permissionCategories = [
    { category: 'Tenant Management', permissions: ['view', 'create', 'edit', 'delete'] },
    { category: 'User Management', permissions: ['view', 'create', 'edit', 'delete', 'impersonate'] },
    { category: 'Device Management', permissions: ['view', 'create', 'edit', 'delete', 'onboard', 'configure'] },
    { category: 'Operations', permissions: ['view', 'manage', 'health', 'sync', 'incidents'] },
    { category: 'Audit & Compliance', permissions: ['view', 'export', 'review'] },
    { category: 'Settings', permissions: ['view', 'edit'] },
    { category: 'Support', permissions: ['debug', 'runbooks'] },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="Roles Management"
        subtitle="Manage user roles and permissions"
      />

      {/* Roles Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} lg={4} key={role.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Shield size={20} />
                      <Typography variant="h6" fontWeight={600}>
                        {role.name}
                      </Typography>
                    </Stack>
                    <StatusPill label={role.key} color={role.color} size="small" />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {role.description}
                  </Typography>

                  <Stack direction="row" spacing={2}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Users size={16} />
                      <Typography variant="body2" fontWeight={600}>
                        {role.userCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        users
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Shield size={16} />
                      <Typography variant="body2" fontWeight={600}>
                        {role.permissions}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        permissions
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Permission Matrix */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Permission Matrix
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Category
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Permissions
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissionCategories.map((category) => (
                  <TableRow key={category.category}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {category.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {category.permissions.map((permission) => (
                          <Chip
                            key={permission}
                            label={permission}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              To view detailed permission assignments for each role, navigate to the Permission Matrix page.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
