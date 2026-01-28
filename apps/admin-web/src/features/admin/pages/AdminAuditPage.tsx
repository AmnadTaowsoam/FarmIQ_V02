import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useAuditLog } from '../../../api/admin/adminQueries';
import { formatDistanceToNow } from 'date-fns';

export const AdminAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);

  const filterParams = filters.reduce((acc, filter) => {
    acc[filter.key] = filter.value;
    return acc;
  }, {} as Record<string, string>);

  const { data, isLoading, refetch } = useAuditLog({
    page,
    pageSize,
    search,
    ...filterParams,
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export audit log');
  };

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString(),
    },
    { field: 'userName', headerName: 'User', width: 150 },
    {
      field: 'action',
      headerName: 'Action',
      width: 180,
      renderCell: (params) => <StatusPill label={params.value} color="primary" size="small" />,
    },
    { field: 'resource', headerName: 'Resource', width: 120 },
    { field: 'tenantName', headerName: 'Tenant', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <StatusPill
          label={params.value.toUpperCase()}
          color={params.value === 'success' ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    { field: 'ipAddress', headerName: 'IP Address', width: 130 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<Eye size={16} />}
          onClick={() => navigate(`/admin/audit-log/${params.row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="Audit Log"
        subtitle="System-wide audit trail and compliance logging"
        actions={
          <Button variant="outlined" startIcon={<Download size={18} />} onClick={handleExport}>
            Export
          </Button>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        totalRows={data?.total}
        pageSize={pageSize}
        searchPlaceholder="Search audit log..."
        filters={filters}
        onFilterChange={setFilters}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={refetch}
        onExport={handleExport}
        syncUrlParams
      />
    </Box>
  );
};
