import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import { Search, Filter, Download, RefreshCw, MoreVertical } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void;
  requiresSelection?: boolean;
}

interface AdminDataTableProps {
  columns: GridColDef[];
  rows: any[];
  loading?: boolean;
  totalRows?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onFilterChange?: (filters: FilterOption[]) => void;
  onSearchChange?: (search: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sort: GridSortModel) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  bulkActions?: BulkAction[];
  enableSelection?: boolean;
  syncUrlParams?: boolean;
  emptyMessage?: string;
}

/**
 * AdminDataTable Component
 * 
 * Enhanced data table with server-side pagination, URL-synced filters, sorting, search, and bulk actions.
 * 
 * Example:
 * <AdminDataTable
 *   columns={columns}
 *   rows={data}
 *   loading={isLoading}
 *   totalRows={totalCount}
 *   searchPlaceholder="Search tenants..."
 *   filters={activeFilters}
 *   onFilterChange={setFilters}
 *   onSearchChange={setSearch}
 *   onPageChange={setPage}
 *   syncUrlParams
 *   bulkActions={[
 *     { label: 'Delete', icon: <Trash />, onClick: handleBulkDelete }
 *   ]}
 * />
 */
export const AdminDataTable: React.FC<AdminDataTableProps> = ({
  columns,
  rows,
  loading = false,
  totalRows,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  searchPlaceholder = 'Search...',
  filters = [],
  onFilterChange,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRefresh,
  onExport,
  bulkActions = [],
  enableSelection = false,
  syncUrlParams = true,
  emptyMessage = 'No data available',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>(),
  });
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const isServerPagination = typeof totalRows === 'number';

  // Initialize from URL params
  useEffect(() => {
    if (syncUrlParams) {
      const page = parseInt(searchParams.get('page') || '0', 10);
      const size = parseInt(searchParams.get('pageSize') || String(pageSize), 10);
      const search = searchParams.get('search') || '';
      const sort = searchParams.get('sort');
      const order = searchParams.get('order');

      setPaginationModel({ page, pageSize: size });
      setSearchValue(search);

      if (sort && order) {
        setSortModel([{ field: sort, sort: order as 'asc' | 'desc' }]);
      }
    }
  }, []);

  // Update URL params when state changes
  useEffect(() => {
    if (syncUrlParams) {
      const params = new URLSearchParams(searchParams);
      
      params.set('page', String(paginationModel.page));
      params.set('pageSize', String(paginationModel.pageSize));
      
      if (searchValue) {
        params.set('search', searchValue);
      } else {
        params.delete('search');
      }

      if (sortModel.length > 0) {
        params.set('sort', sortModel[0].field);
        params.set('order', sortModel[0].sort || 'asc');
      } else {
        params.delete('sort');
        params.delete('order');
      }

      setSearchParams(params, { replace: true });
    }
  }, [paginationModel, searchValue, sortModel, syncUrlParams]);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    onPageChange?.(model.page);
    onPageSizeChange?.(model.pageSize);
  };

  const handleSortChange = (model: GridSortModel) => {
    setSortModel(model);
    onSortChange?.(model);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearchChange?.(value);
    // Reset to first page on search
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleRemoveFilter = (filterToRemove: FilterOption) => {
    const newFilters = filters.filter(f => f.key !== filterToRemove.key || f.value !== filterToRemove.value);
    onFilterChange?.(newFilters);
  };

  const handleBulkActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setBulkMenuAnchor(event.currentTarget);
  };

  const handleBulkActionClose = () => {
    setBulkMenuAnchor(null);
  };

  const handleBulkActionSelect = (action: BulkAction) => {
    // Convert Set to Array for the callback
    const selectedIds = Array.from(selectionModel.ids).map(id => String(id));
    action.onClick(selectedIds);
    handleBulkActionClose();
    setSelectionModel({ type: 'include', ids: new Set() });
  };

  return (
    <Box>
      {/* Search and Actions Bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />

        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          {enableSelection && bulkActions.length > 0 && selectionModel.ids.size > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MoreVertical size={16} />}
                onClick={handleBulkActionClick}
              >
                Actions ({selectionModel.ids.size})
              </Button>
              <Menu
                anchorEl={bulkMenuAnchor}
                open={Boolean(bulkMenuAnchor)}
                onClose={handleBulkActionClose}
              >
                {bulkActions.map((action, index) => (
                  <MenuItem
                    key={index}
                    onClick={() => handleBulkActionSelect(action)}
                    disabled={action.requiresSelection && selectionModel.ids.size === 0}
                  >
                    {action.icon && <Box sx={{ mr: 1, display: 'flex' }}>{action.icon}</Box>}
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh}>
                <RefreshCw size={18} />
              </IconButton>
            </Tooltip>
          )}

          {onExport && (
            <Tooltip title="Export">
              <IconButton size="small" onClick={onExport}>
                <Download size={18} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Active Filters */}
      {filters.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {filters.map((filter, index) => (
            <Chip
              key={`${filter.key}-${filter.value}-${index}`}
              label={`${filter.label}: ${filter.value}`}
              size="small"
              onDelete={() => handleRemoveFilter(filter)}
              icon={<Filter size={14} />}
            />
          ))}
        </Stack>
      )}

      {/* Data Grid */}
      <Paper sx={{ width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationChange}
          sortModel={sortModel}
          onSortModelChange={handleSortChange}
          pageSizeOptions={pageSizeOptions}
          {...(isServerPagination ? { rowCount: totalRows } : {})}
          paginationMode={isServerPagination ? 'server' : 'client'}
          sortingMode={isServerPagination ? 'server' : 'client'}
          checkboxSelection={enableSelection}
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={setSelectionModel}
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'action.hover',
            },
          }}
          localeText={{
            noRowsLabel: emptyMessage,
          }}
        />
      </Paper>
    </Box>
  );
};
