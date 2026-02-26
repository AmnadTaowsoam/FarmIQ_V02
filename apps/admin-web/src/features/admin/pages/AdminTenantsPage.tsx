import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useTenantsQuery } from '../../../api/admin/adminQueries';
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

  const { data, isLoading, refetch } = useTenantsQuery({
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
      field: 'barnCount',
      headerName: 'Barns',
      width: 100,
      type: 'number',
    },
    {
      field: 'batchCount',
      headerName: 'Batches',
      width: 110,
      type: 'number',
    },
    {
      field: 'deviceCount',
      headerName: 'Devices',
      width: 100,
      type: 'number',
    },
    {
      field: 'sensorCount',
      headerName: 'Sensors',
      width: 100,
      type: 'number',
    },
    {
      field: 'sensorBindingCount',
      headerName: 'Bindings',
      width: 110,
      type: 'number',
    },
    {
      field: 'sensorCalibrationCount',
      headerName: 'Calibrations',
      width: 130,
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
          type="button"
          size="small"
          startIcon={<Eye size={16} />}
          onClick={() => navigate(`/tenants/${params.row.id}`)}
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
          <Button
            type="button"
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/tenants/new')}
          >
            Create Tenant
          </Button>
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
