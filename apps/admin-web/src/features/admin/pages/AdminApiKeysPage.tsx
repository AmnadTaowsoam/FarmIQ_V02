import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  createdAt: Date;
  lastUsed: Date | null;
  status: 'active' | 'revoked';
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    prefix: 'sk_live_',
    permissions: ['read', 'write'],
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-01-27'),
    status: 'active'
  },
  {
    id: '2',
    name: 'Test API Key',
    key: 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    prefix: 'sk_test_',
    permissions: ['read'],
    createdAt: new Date('2024-01-20'),
    lastUsed: new Date('2024-01-26'),
    status: 'active'
  },
  {
    id: '3',
    name: 'Legacy Key',
    key: 'sk_old_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    prefix: 'sk_old_',
    permissions: ['read', 'write', 'delete'],
    createdAt: new Date('2023-12-01'),
    lastUsed: null,
    status: 'revoked'
  },
];

export const AdminApiKeysPage: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showKeys, setShowKeys] = React.useState<{ [key: string]: boolean }>({});
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<ApiKey | null>(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const filteredKeys = mockApiKeys.filter(apiKey =>
    apiKey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apiKey.prefix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setSnackbar({ open: true, message: 'API key copied to clipboard', severity: 'success' });
  };

  const handleRevokeKey = (apiKey: ApiKey) => {
    setSelectedKey(apiKey);
    setShowRevokeDialog(true);
  };

  const confirmRevoke = () => {
    setSnackbar({ open: true, message: 'API key revoked successfully', severity: 'success' });
    setShowRevokeDialog(false);
    setSelectedKey(null);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="API Keys"
        subtitle="Manage API access keys for integrations"
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Create API Key
          </Button>
        }
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FadeIn delay={100}>
            <PremiumCard sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }}>
                  <Key size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Keys</Typography>
                  <Typography variant="h5" fontWeight={700}>{mockApiKeys.length}</Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FadeIn delay={200}>
            <PremiumCard sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.main'
                }}>
                  <Check size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Active</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockApiKeys.filter(k => k.status === 'active').length}
                  </Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FadeIn delay={300}>
            <PremiumCard sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: 'error.main'
                }}>
                  <X size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Revoked</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockApiKeys.filter(k => k.status === 'revoked').length}
                  </Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FadeIn delay={400}>
            <PremiumCard sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main'
                }}>
                  <RefreshCw size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Recently Used</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockApiKeys.filter(k => k.lastUsed &&
                      (new Date().getTime() - k.lastUsed.getTime()) < 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <PremiumCard sx={{ mb: 3 }}>
        <TextField
          placeholder="Search API keys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={theme.palette.text.secondary} />
              </InputAdornment>
            ),
          }}
          fullWidth
        />
      </PremiumCard>

      {/* API Keys List */}
      <Grid container spacing={3}>
        {filteredKeys.map((apiKey, index) => (
          <Grid item xs={12} key={apiKey.id}>
            <FadeIn delay={index * 50}>
              <PremiumCard
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main'
                        }}>
                          <Key size={24} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {apiKey.name}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={0.5}>
                            <Chip
                              label={apiKey.status.toUpperCase()}
                              size="small"
                              color={apiKey.status === 'active' ? 'success' : 'error'}
                              sx={{ borderRadius: 1 }}
                            />
                            <Chip
                              label={`${apiKey.permissions.length} permissions`}
                              size="small"
                              variant="outlined"
                              sx={{ borderRadius: 1 }}
                            />
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={showKeys[apiKey.id] ? 'Hide Key' : 'Show Key'}>
                          <IconButton
                            size="small"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {showKeys[apiKey.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy Key">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyKey(apiKey.key)}
                          >
                            <Copy size={18} />
                          </IconButton>
                        </Tooltip>
                        {apiKey.status === 'active' && (
                          <Tooltip title="Revoke Key">
                            <IconButton
                              size="small"
                              onClick={() => handleRevokeKey(apiKey)}
                              color="error"
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>

                    <Box sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all'
                    }}>
                      {showKeys[apiKey.id] ? apiKey.key : apiKey.prefix + '•'.repeat(32)}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Created {formatDistanceToNow(apiKey.createdAt, { addSuffix: true })}
                      </Typography>
                      {apiKey.lastUsed ? (
                        <Typography variant="caption" color="text.secondary">
                          Last used {formatDistanceToNow(apiKey.lastUsed, { addSuffix: true })}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Never used
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </PremiumCard>
            </FadeIn>
          </Grid>
        ))}
      </Grid>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onClose={() => setShowRevokeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to revoke the API key "{selectedKey?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmRevoke}
            variant="contained"
            color="error"
            startIcon={<Trash2 size={18} />}
          >
            Revoke Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
