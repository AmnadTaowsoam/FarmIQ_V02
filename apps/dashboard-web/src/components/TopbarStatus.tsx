import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, Menu, MenuItem, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Info, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useDegradedMode } from '../hooks/useDegradedMode';

const formatTime = (date: Date | null): string => {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const TopbarStatus: React.FC = () => {
  const theme = useTheme();
  const hideLabel = useMediaQuery(theme.breakpoints.down('sm'));
  const hideText = useMediaQuery(theme.breakpoints.down('lg'));
  const collapseActions = useMediaQuery(theme.breakpoints.down('md'));
  const { isDegraded, lastUpdate, reason, retry } = useDegradedMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const mode = useMemo<'live' | 'cached' | 'offline'>(() => {
    if (!isDegraded) return 'live';
    return lastUpdate ? 'cached' : 'offline';
  }, [isDegraded, lastUpdate]);

  const palette = useMemo(() => {
    if (mode === 'live') return theme.palette.success;
    if (mode === 'cached') return theme.palette.warning;
    return theme.palette.error;
  }, [mode, theme.palette]);

  const label = mode.toUpperCase();
  const timeLabel = formatTime(lastUpdate);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Tooltip title={`Status: ${label}`}>
        <Chip
          size="small"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: palette.main,
                  boxShadow: `0 0 0 3px ${alpha(palette.main, 0.15)}`,
                }}
              />
              {!hideLabel && (
                <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: 0.4 }}>
                  {label}
                </Typography>
              )}
            </Box>
          }
          sx={{
            bgcolor: alpha(palette.main, 0.12),
            color: palette.main,
            border: `1px solid ${alpha(palette.main, 0.3)}`,
            px: 0.5,
          }}
        />
      </Tooltip>

      {!hideText && (
        <Typography variant="caption" color="text.secondary">
          Last updated: {timeLabel}
        </Typography>
      )}

      {collapseActions ? (
        <Tooltip title="Status actions">
          <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)}>
            <MoreHorizontal size={16} />
          </IconButton>
        </Tooltip>
      ) : (
        <>
          <Button size="small" variant="text" onClick={retry} startIcon={<RefreshCw size={14} />}>
            Retry
          </Button>
          <Button size="small" variant="text" onClick={(event) => setAnchorEl(event.currentTarget)} startIcon={<Info size={14} />}>
            Details
          </Button>
        </>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            Status: {label}
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Last updated: {timeLabel}
          </Typography>
        </MenuItem>
        {reason && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {reason}
            </Typography>
          </MenuItem>
        )}
        {collapseActions && (
          <>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                retry();
              }}
            >
              <RefreshCw size={14} style={{ marginRight: 8 }} />
              Retry
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <Info size={14} style={{ marginRight: 8 }} />
              Details
            </MenuItem>
          </>
        )}
      </Menu>
    </Stack>
  );
};
