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
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  User,
  Shield
} from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: Date;
  status: 'success' | 'failure' | 'warning';
  details: string;
  ipAddress: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'User Login',
    actor: 'admin@farmiq.com',
    target: 'System',
    timestamp: new Date('2024-01-27T14:30:00'),
    status: 'success',
    details: 'Successful login from 192.168.1.100',
    ipAddress: '192.168.1.100'
  },
  {
    id: '2',
    action: 'Create Tenant',
    actor: 'admin@farmiq.com',
    target: 'tenant-123',
    timestamp: new Date('2024-01-27T13:45:00'),
    status: 'success',
    details: 'Created new tenant organization',
    ipAddress: '192.168.1.100'
  },
  {
    id: '3',
    action: 'Delete User',
    actor: 'admin@farmiq.com',
    target: 'user-456',
    timestamp: new Date('2024-01-27T12:30:00'),
    status: 'success',
    details: 'Deleted user account',
    ipAddress: '192.168.1.100'
  },
  {
    id: '4',
    action: 'Failed Login Attempt',
    actor: 'unknown@hacker.com',
    target: 'System',
    timestamp: new Date('2024-01-27T11:15:00'),
    status: 'failure',
    details: 'Invalid credentials provided',
    ipAddress: '10.0.0.55'
  },
  {
    id: '5',
    action: 'Permission Change',
    actor: 'admin@farmiq.com',
    target: 'user-789',
    timestamp: new Date('2024-01-27T10:00:00'),
    status: 'warning',
    details: 'Elevated user permissions',
    ipAddress: '192.168.1.100'
  },
  {
    id: '6',
    action: 'API Key Generated',
    actor: 'user-789',
    target: 'api-key-abc',
    timestamp: new Date('2024-01-27T09:30:00'),
    status: 'success',
    details: 'Generated new API key',
    ipAddress: '192.168.1.150'
  },
];

export const AdminAuditLogsPage: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [actionFilter, setActionFilter] = React.useState<string>('all');

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesStatus && matchesAction;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} color={theme.palette.success.main} />;
      case 'failure':
        return <XCircle size={16} color={theme.palette.error.main} />;
      case 'warning':
        return <AlertTriangle size={16} color={theme.palette.warning.main} />;
      default:
        return <Info size={16} color={theme.palette.info.main} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failure':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Track all system actions and security events"
        action={
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            sx={{ borderRadius: 2 }}
          >
            Export Logs
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
                  <FileText size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Logs</Typography>
                  <Typography variant="h5" fontWeight={700}>{mockAuditLogs.length}</Typography>
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
                  <CheckCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Successful</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockAuditLogs.filter(l => l.status === 'success').length}
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
                  <XCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Failed</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockAuditLogs.filter(l => l.status === 'failure').length}
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
                  <AlertTriangle size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Warnings</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockAuditLogs.filter(l => l.status === 'warning').length}
                  </Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
      </Grid>

      {/* Filters */}
      <PremiumCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failure">Failure</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              label="Action"
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="User Login">User Login</MenuItem>
              <MenuItem value="Create Tenant">Create Tenant</MenuItem>
              <MenuItem value="Delete User">Delete User</MenuItem>
              <MenuItem value="Failed Login Attempt">Failed Login</MenuItem>
              <MenuItem value="Permission Change">Permission Change</MenuItem>
              <MenuItem value="API Key Generated">API Key Generated</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Stack>
      </PremiumCard>

      {/* Audit Logs List */}
      <Grid container spacing={3}>
        {filteredLogs.map((log, index) => (
          <Grid item xs={12} key={log.id}>
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
                          bgcolor: alpha(theme.palette[getStatusColor(log.status)].main, 0.1),
                          color: `${getStatusColor(log.status)}.main`
                        }}>
                          {getStatusIcon(log.status)}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {log.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        label={log.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(log.status)}
                        sx={{ borderRadius: 1 }}
                      />
                    </Box>

                    <Box sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        {log.details}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <User size={16} color={theme.palette.text.secondary} />
                        <Typography variant="body2" fontWeight={600}>
                          {log.actor}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Shield size={16} color={theme.palette.text.secondary} />
                        <Typography variant="body2" fontWeight={600}>
                          {log.target}
                        </Typography>
                      </Stack>
                      <Box sx={{ ml: 'auto' }}>
                        <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                          {log.ipAddress}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </PremiumCard>
            </FadeIn>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
