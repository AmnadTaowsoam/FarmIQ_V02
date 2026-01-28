import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Download, Search, Check, X, Minus } from 'lucide-react';
import {
  AdminRole,
  Permission,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PERMISSION_CATEGORIES,
  getPermissionLabel,
} from '../../../lib/permissions';

type PermissionStatus = 'full' | 'scoped' | 'none';

export const PermissionMatrixPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get all roles and permissions
  const roles = Object.values(AdminRole);
  const allPermissions = Object.values(Permission);

  // Filter permissions by category
  const filteredPermissions = useMemo(() => {
    let permissions = allPermissions;

    // Filter by category
    if (selectedCategory !== 'all') {
      const categoryPermissions = PERMISSION_CATEGORIES[selectedCategory as keyof typeof PERMISSION_CATEGORIES] || [];
      permissions = permissions.filter((p) => categoryPermissions.includes(p));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      permissions = permissions.filter((p) => {
        const label = getPermissionLabel(p).toLowerCase();
        const key = p.toLowerCase();
        return label.includes(query) || key.includes(query);
      });
    }

    return permissions;
  }, [allPermissions, selectedCategory, searchQuery]);

  // Determine permission status for a role
  const getPermissionStatus = (role: AdminRole, permission: Permission): PermissionStatus => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    
    if (rolePermissions.includes(permission)) {
      // Check if it's scoped (for certain roles)
      const scopedRoles = [AdminRole.TENANT_ADMIN, AdminRole.FARM_MANAGER, AdminRole.READ_ONLY];
      if (scopedRoles.includes(role)) {
        return 'scoped';
      }
      return 'full';
    }
    
    return 'none';
  };

  // Get cell color based on status
  const getCellColor = (status: PermissionStatus) => {
    switch (status) {
      case 'full':
        return 'success.light';
      case 'scoped':
        return 'warning.light';
      case 'none':
        return 'grey.100';
    }
  };

  // Get cell icon
  const getCellIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'full':
        return <Check size={16} color="green" />;
      case 'scoped':
        return <Minus size={16} color="orange" />;
      case 'none':
        return <X size={16} color="grey" />;
    }
  };

  // Get tooltip text
  const getTooltipText = (role: AdminRole, permission: Permission, status: PermissionStatus) => {
    const roleLabel = role.replace(/_/g, ' ');
    const permLabel = getPermissionLabel(permission);
    
    switch (status) {
      case 'full':
        return `${roleLabel} has full access to: ${permLabel}`;
      case 'scoped':
        return `${roleLabel} has scoped access to: ${permLabel} (limited to assigned resources)`;
      case 'none':
        return `${roleLabel} does not have access to: ${permLabel}`;
    }
  };

  // Export matrix as CSV
  const handleExport = () => {
    const headers = ['Permission', ...roles.map((r) => r.replace(/_/g, ' '))];
    const rows = filteredPermissions.map((permission) => {
      const permLabel = getPermissionLabel(permission);
      const cells = roles.map((role) => {
        const status = getPermissionStatus(role, permission);
        return status === 'full' ? '✓' : status === 'scoped' ? '~' : '—';
      });
      return [permLabel, ...cells];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'permission-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <AdminPageHeader
        title="Permission Matrix"
        subtitle="Role-based access control overview"
        actions={
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search size={20} style={{ marginRight: 8 }} />,
              }}
              sx={{ flexGrow: 1 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="governance">Governance</MenuItem>
                <MenuItem value="identity">Identity & Access</MenuItem>
                <MenuItem value="fleet">Fleet Management</MenuItem>
                <MenuItem value="operations">Operations</MenuItem>
                <MenuItem value="compliance">Compliance</MenuItem>
                <MenuItem value="support">Support</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Legend
          </Typography>
          <Stack direction="row" spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Check size={16} color="green" />
              <Typography variant="body2">Full Access</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Minus size={16} color="orange" />
              <Typography variant="body2">Scoped Access (limited to assigned resources)</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <X size={16} color="grey" />
              <Typography variant="body2">No Access</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      minWidth: 250,
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'background.paper',
                      zIndex: 3,
                    }}
                  >
                    Permission
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell
                      key={role}
                      align="center"
                      sx={{
                        fontWeight: 600,
                        minWidth: 120,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Tooltip title={ROLE_DESCRIPTIONS[role]}>
                        <span>{role.replace(/_/g, ' ')}</span>
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPermissions.map((permission) => (
                  <TableRow key={permission} hover>
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 1,
                      }}
                    >
                      <Tooltip title={permission}>
                        <span>{getPermissionLabel(permission)}</span>
                      </Tooltip>
                    </TableCell>
                    {roles.map((role) => {
                      const status = getPermissionStatus(role, permission);
                      return (
                        <TableCell
                          key={`${role}-${permission}`}
                          align="center"
                          sx={{
                            bgcolor: getCellColor(status),
                            cursor: 'help',
                          }}
                        >
                          <Tooltip title={getTooltipText(role, permission, status)}>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              {getCellIcon(status)}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredPermissions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No permissions found matching your filters
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredPermissions.length} of {allPermissions.length} permissions
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Role Descriptions
          </Typography>
          <Stack spacing={2}>
            {roles.map((role) => (
              <Box key={role}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={role.replace(/_/g, ' ')} size="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {ROLE_DESCRIPTIONS[role]}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
