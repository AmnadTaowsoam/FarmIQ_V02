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
  InputAdornment
} from '@mui/material';
import {
  Shield,
  Lock,
  Key,
  UserPlus,
  Trash2,
  Edit,
  MoreVertical,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  scope: 'global' | 'tenant' | 'user';
}

const mockPermissions: Permission[] = [
  { id: '1', name: 'Create Tenant', description: 'Create new tenant organizations', category: 'Tenant Management', scope: 'global' },
  { id: '2', name: 'Delete Tenant', description: 'Permanently delete tenant organizations', category: 'Tenant Management', scope: 'global' },
  { id: '3', name: 'Manage Users', description: 'Create, edit, and delete users', category: 'User Management', scope: 'tenant' },
  { id: '4', name: 'Assign Roles', description: 'Assign roles to users', category: 'User Management', scope: 'tenant' },
  { id: '5', name: 'View Analytics', description: 'Access analytics and reports', category: 'Analytics', scope: 'tenant' },
  { id: '6', name: 'Export Data', description: 'Export data from the system', category: 'Data Management', scope: 'tenant' },
  { id: '7', name: 'System Settings', description: 'Modify system-wide settings', category: 'System', scope: 'global' },
  { id: '8', name: 'API Access', description: 'Access API endpoints', category: 'API', scope: 'user' },
];

export const AdminPermissionsPage: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');

  const categories = ['All', ...Array.from(new Set(mockPermissions.map(p => p.category)))];

  const filteredPermissions = mockPermissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Permissions"
        subtitle="Manage system-wide access control and permissions"
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{ borderRadius: 2 }}
          >
            Add Permission
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
                  <Shield size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Permissions</Typography>
                  <Typography variant="h5" fontWeight={700}>{mockPermissions.length}</Typography>
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
                  <Typography variant="caption" color="text.secondary">Active</Typography>
                  <Typography variant="h5" fontWeight={700}>{mockPermissions.length}</Typography>
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
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main'
                }}>
                  <Lock size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Global Scope</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {mockPermissions.filter(p => p.scope === 'global').length}
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
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: 'info.main'
                }}>
                  <Key size={24} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Categories</Typography>
                  <Typography variant="h5" fontWeight={700}>{categories.length - 1}</Typography>
                </Box>
              </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <PremiumCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder="Search permissions..."
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
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {categories.map((category) => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Stack>
        </Stack>
      </PremiumCard>

      {/* Permissions List */}
      <Grid container spacing={3}>
        {filteredPermissions.map((permission, index) => (
          <Grid item xs={12} md={6} lg={4} key={permission.id}>
            <FadeIn delay={index * 50}>
              <PremiumCard
                sx={{
                  height: '100%',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main'
                      }}>
                        <Lock size={24} />
                      </Box>
                      <IconButton size="small">
                        <MoreVertical size={18} />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h6" fontWeight={700}>
                      {permission.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {permission.description}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={permission.category}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1 }}
                      />
                      <Chip
                        label={permission.scope}
                        size="small"
                        color={
                          permission.scope === 'global' ? 'error' :
                          permission.scope === 'tenant' ? 'warning' : 'info'
                        }
                        sx={{ borderRadius: 1 }}
                      />
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
