import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useUsers } from '../../../api/admin/adminQueries';
import { formatDistanceToNow } from 'date-fns';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);

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

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    {
      field: 'roles',
      headerName: 'Roles',
      width: 150,
      renderCell: (params) => (
        <StatusPill label={params.value[0]?.replace('_', ' ').toUpperCase() || 'N/A'} color="primary" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusPill
          label={params.value.toUpperCase()}
          color={params.value === 'active' ? 'success' : 'error'}
        />
      ),
    },
    { field: 'tenantName', headerName: 'Tenant', width: 150 },
    {
      field: 'lastLogin',
      headerName: 'Last Login',
      width: 150,
      renderCell: (params) =>
        params.value ? formatDistanceToNow(new Date(params.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<Eye size={16} />}
          onClick={() => navigate(`/admin/identity/users/${params.row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="User Management"
        subtitle="Manage users, roles, and permissions"
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
    </Box>
  );
};
