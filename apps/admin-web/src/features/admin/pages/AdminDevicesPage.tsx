import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { useDevicesQuery } from '../../../api/admin/adminQueries';
import { formatDistanceToNow } from 'date-fns';

export const AdminDevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);

  const filterParams = filters.reduce((acc, filter) => {
    acc[filter.key] = filter.value;
    return acc;
  }, {} as Record<string, string>);

  const { data, isLoading, refetch } = useDevicesQuery({
    page,
    pageSize,
    search,
    ...filterParams,
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Device Name', flex: 1, minWidth: 150 },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => <StatusPill label={params.value.toUpperCase()} color="info" />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <HealthBadge
          status={params.value === 'online' ? 'healthy' : params.value === 'offline' ? 'degraded' : 'critical'}
          label={params.value.toUpperCase()}
          showIcon
        />
      ),
    },
    { field: 'tenantName', headerName: 'Tenant', width: 150 },
    { field: 'farmName', headerName: 'Farm', width: 150 },
    { field: 'barnName', headerName: 'Barn', width: 150 },
    { field: 'ipAddress', headerName: 'IP Address', width: 130 },
    {
      field: 'lastSeen',
      headerName: 'Last Seen',
      width: 150,
      renderCell: (params) => formatDistanceToNow(new Date(params.value), { addSuffix: true }),
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
          onClick={() => navigate(`/admin/devices/${params.row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="Device Management"
        subtitle="Global device inventory and monitoring"
        actions={
          <Button variant="contained" onClick={() => navigate('/admin/devices/onboarding')}>
            Onboard Device
          </Button>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        totalRows={data?.total}
        pageSize={pageSize}
        searchPlaceholder="Search devices..."
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
