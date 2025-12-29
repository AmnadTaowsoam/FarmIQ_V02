import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useTenants } from '../../../api/admin/adminQueries';
import { Permission } from '../../../lib/permissions';
import { PermissionGate } from '../../../guards/PermissionGate';
import { formatDistanceToNow } from 'date-fns';

export const AdminTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);

  // Extract filter values
  const filterParams = filters.reduce((acc, filter) => {
    acc[filter.key] = filter.value;
    return acc;
  }, {} as Record<string, string>);

  const { data, isLoading, refetch } = useTenants({
    page,
    pageSize,
    search,
    ...filterParams,
  });

  // Safely extract data - handle both {data: [...]} and [...] formats
  const tenants = data?.data || data || [];
  const totalRows = data?.total || (Array.isArray(data) ? data.length : 0);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tenant Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <StatusPill
          label={params.value?.toUpperCase() || 'UNKNOWN'}
          color={
            params.value === 'enterprise'
              ? 'primary'
              : params.value === 'standard'
              ? 'info'
              : 'default'
          }
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusPill
          label={params.value?.toUpperCase() || 'UNKNOWN'}
          color={
            params.value === 'active'
              ? 'success'
              : params.value === 'suspended'
              ? 'warning'
              : 'error'
          }
        />
      ),
    },
    {
      field: 'region',
      headerName: 'Region',
      width: 150,
    },
    {
      field: 'farmCount',
      headerName: 'Farms',
      width: 100,
      type: 'number',
    },
    {
      field: 'deviceCount',
      headerName: 'Devices',
      width: 100,
      type: 'number',
    },
    {
      field: 'userCount',
      headerName: 'Users',
      width: 100,
      type: 'number',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      renderCell: (params) => {
        try {
          return formatDistanceToNow(new Date(params.value), { addSuffix: true })
        } catch {
          return 'Unknown'
        }
      },
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
          onClick={() => navigate(`/admin/tenants/${params.row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="Tenant Management"
        subtitle="Manage tenants and their configurations"
        actions={
          <PermissionGate requiredPermissions={[Permission.TENANT_WRITE]} mode="ui" showTooltip>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate('/admin/tenants/new')}
            >
              Create Tenant
            </Button>
          </PermissionGate>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={tenants}
        loading={isLoading}
        totalRows={totalRows}
        pageSize={pageSize}
        searchPlaceholder="Search tenants..."
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
