import React from 'react';
import { Box, Breadcrumbs, Chip, IconButton, Link, Typography } from '@mui/material';
import { ChevronRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveContext } from '../../contexts/ActiveContext';

export const ContextBar: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId, farmId, barnId, batchId, hasRequiredContext } = useActiveContext();

  // Don't show if no context at all
  if (!tenantId) {
    return null;
  }

  const contextItems = [
    { label: 'Tenant', value: tenantId, path: '/select-tenant' },
    { label: 'Farm', value: farmId, path: '/select-farm' },
    { label: 'Barn', value: barnId, path: '/select-farm' },
    { label: 'Batch', value: batchId, path: '/select-farm' },
  ].filter(item => item.value);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1.5,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Breadcrumbs
        separator={<ChevronRight size={14} />}
        sx={{ flex: 1 }}
      >
        {contextItems.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {item.label}:
            </Typography>
            <Chip
              label={item.value?.slice(0, 8) || 'None'}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        ))}
      </Breadcrumbs>

      <IconButton
        size="small"
        onClick={() => navigate('/select-tenant')}
        sx={{ ml: 'auto' }}
        title="Change context"
      >
        <Settings size={16} />
      </IconButton>
    </Box>
  );
};
