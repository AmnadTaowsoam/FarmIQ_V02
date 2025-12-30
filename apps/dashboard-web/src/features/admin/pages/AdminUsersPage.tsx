import React, { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Stack, IconButton, Tooltip } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useAdminRoles, useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '../../../api/admin/adminQueries';
import { formatDistanceToNow } from 'date-fns';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    tenantId: '',
    roles: [] as string[],
  });

  const filterParams = filters.reduce((acc, filter) => {
    acc[filter.key] = filter.value;
    return acc;
  }, {} as Record<string, string>);

  const { data, isLoading, refetch } = useUsers({
    page,
    pageSize,
    search,
    ...filterParams,
  });
  const rolesQuery = useAdminRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const roleOptions = useMemo(() => rolesQuery.data?.data?.map((role) => role.name) || [], [rolesQuery.data]);

  const openCreateDialog = () => {
    setEditingUserId(null);
    setFormValues({ email: '', password: '', tenantId: '', roles: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUserId(user.id);
    setFormValues({
      email: user.email || '',
      password: '',
      tenantId: user.tenantId || '',
      roles: user.roles || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      email: formValues.email,
      password: formValues.password || undefined,
      tenantId: formValues.tenantId || null,
      roles: formValues.roles,
    };

    if (editingUserId) {
      await updateUser.mutateAsync({ id: editingUserId, data: payload });
    } else {
      await createUser.mutateAsync(payload);
    }

    setDialogOpen(false);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    {
      field: 'roles',
      headerName: 'Roles',
      width: 130,
      renderCell: (params) => (
        <StatusPill label={params.value[0]?.replace('_', ' ').toUpperCase() || 'N/A'} color="primary" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <StatusPill
          label={params.value.toUpperCase()}
          color={params.value === 'active' ? 'success' : 'error'}
        />
      ),
    },
    { field: 'tenantName', headerName: 'Tenant', width: 130 },
    {
      field: 'lastLogin',
      headerName: 'Last Login',
      width: 130,
      renderCell: (params) =>
        params.value ? formatDistanceToNow(new Date(params.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => navigate(`/admin/identity/users/${params.row.id}`)}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEditDialog(params.row)}>
              <Pencil size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (window.confirm('Delete this user?')) {
                  deleteUser.mutate(params.row.id);
                }
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="User Management"
        subtitle="Manage users, roles, and permissions"
        actions={
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreateDialog}>
            Create User
          </Button>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        totalRows={data?.total}
        pageSize={pageSize}
        searchPlaceholder="Search users..."
        filters={filters}
        onFilterChange={setFilters}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={refetch}
        syncUrlParams
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUserId ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              fullWidth
              value={formValues.email}
              onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={formValues.password}
              onChange={(e) => setFormValues((prev) => ({ ...prev, password: e.target.value }))}
              helperText={editingUserId ? 'Leave blank to keep current password' : 'Defaults to password123 if empty'}
            />
            <TextField
              label="Tenant ID"
              fullWidth
              value={formValues.tenantId}
              onChange={(e) => setFormValues((prev) => ({ ...prev, tenantId: e.target.value }))}
            />
            <TextField
              label="Roles"
              select
              fullWidth
              SelectProps={{ multiple: true }}
              value={formValues.roles}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                }))
              }
            >
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formValues.email || createUser.isPending || updateUser.isPending}
          >
            {editingUserId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
