import React from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Filter, RefreshCw } from 'lucide-react';

export interface BarnRecordsFilters {
  farmId: string;
  barnId: string;
  batchId: string;
  startDate: string;
  endDate: string;
}

interface BarnRecordsFilterBarProps {
  value: BarnRecordsFilters;
  onChange: (next: BarnRecordsFilters) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

export const BarnRecordsFilterBar: React.FC<BarnRecordsFilterBarProps> = ({
  value,
  onChange,
  onApply,
  onReset,
  loading = false,
}) => {
  const handleField = (field: keyof BarnRecordsFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [field]: event.target.value });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          label="Farm ID"
          size="small"
          value={value.farmId}
          onChange={handleField('farmId')}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Barn ID"
          size="small"
          required
          value={value.barnId}
          onChange={handleField('barnId')}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Batch ID"
          size="small"
          value={value.batchId}
          onChange={handleField('batchId')}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Start Date"
          type="date"
          size="small"
          required
          InputLabelProps={{ shrink: true }}
          value={value.startDate}
          onChange={handleField('startDate')}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          required
          InputLabelProps={{ shrink: true }}
          value={value.endDate}
          onChange={handleField('endDate')}
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Filter size={18} />}
            onClick={onApply}
            disabled={loading}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={onReset}
            disabled={loading}
          >
            Reset
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
