import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
} from '@mui/material';
import { X, Copy, ExternalLink } from 'lucide-react';
import { useActiveContext } from '../../contexts/ActiveContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRequestId } from '../../hooks/useRequestId';

interface SupportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SupportDrawer: React.FC<SupportDrawerProps> = ({ open, onClose }) => {
  const { tenantId, farmId, barnId } = useActiveContext();
  const { user } = useAuth();
  const { lastRequestId } = useRequestId();

  const appVersion = import.meta.env.VITE_APP_VERSION || import.meta.env.PACKAGE_VERSION || '0.1.0';
  const environment = import.meta.env.MODE || 'development';
  const bffBaseUrl = import.meta.env.VITE_BFF_BASE_URL || 'not configured';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Support Information</Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemText
              primary="App Version"
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">{appVersion}</Typography>
                  <Chip label={environment} size="small" color={environment === 'production' ? 'success' : 'default'} />
                </Box>
              }
            />
          </ListItem>

          <ListItem>
            <ListItemText
              primary="BFF Base URL"
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {bffBaseUrl}
                  </Typography>
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ my: 2 }} />

          <ListItem>
            <ListItemText
              primary="Active Context"
              secondary={
                <Box>
                  {tenantId && (
                    <Typography variant="body2">Tenant: {tenantId.substring(0, 8)}...</Typography>
                  )}
                  {farmId && (
                    <Typography variant="body2">Farm: {farmId.substring(0, 8)}...</Typography>
                  )}
                  {barnId && (
                    <Typography variant="body2">Barn: {barnId.substring(0, 8)}...</Typography>
                  )}
                  {!tenantId && (
                    <Typography variant="body2" color="text.secondary">No context selected</Typography>
                  )}
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ my: 2 }} />

          <ListItem>
            <ListItemText
              primary="User"
              secondary={
                <Box>
                  <Typography variant="body2">{user?.email || 'Not logged in'}</Typography>
                  {user?.roles && (
                    <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                      {user.roles.map((role) => (
                        <Chip key={role} label={role} size="small" />
                      ))}
                    </Box>
                  )}
                </Box>
              }
            />
          </ListItem>

          <Divider sx={{ my: 2 }} />

          <ListItem>
            <ListItemText
              primary="Last Request ID"
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {lastRequestId || 'N/A'}
                  </Typography>
                  {lastRequestId && (
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(lastRequestId)}
                      title="Copy Request ID"
                    >
                      <Copy size={16} />
                    </IconButton>
                  )}
                </Box>
              }
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ExternalLink size={16} />}
            href="https://github.com/farmiq/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report Issue
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

