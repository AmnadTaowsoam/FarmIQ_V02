import React, { useState } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, Grid, Stack, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useUser } from '../../../api/admin/adminQueries';
import { User, Shield, Clock, Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState(0);

  const { data: user, isLoading, error } = useUser(userId || '');

  if (error) {
    return (
      <Box>
        <AdminPageHeader title="User Details" />
        <Card>
          <CardContent>
            <Typography color="error">Failed to load user details</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading || !user) {
    return (
      <Box>
        <AdminPageHeader title="User Details" />
        <Card>
          <CardContent>
            <Typography>Loading user details...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Mock data for tabs
  const accessScopes = [
    { tenant: 'Acme Farms', farms: ['Farm A', 'Farm B'], barns: ['Barn 1', 'Barn 2', 'Barn 3'] },
    { tenant: 'Green Valley', farms: ['Farm C'], barns: ['Barn 4'] },
  ];

  const effectivePermissions = [
    { resource: 'Tenant', permissions: ['view', 'edit'] },
    { resource: 'Farm', permissions: ['view', 'edit', 'create'] },
    { resource: 'Barn', permissions: ['view', 'edit', 'create', 'delete'] },
    { resource: 'Device', permissions: ['view', 'configure'] },
    { resource: 'User', permissions: ['view'] },
  ];

  const sessions = [
    { id: '1', device: 'Chrome on Windows', location: 'Bangkok, Thailand', lastActive: new Date(Date.now() - 5 * 60 * 1000), current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Bangkok, Thailand', lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), current: false },
    { id: '3', device: 'Chrome on macOS', location: 'Chiang Mai, Thailand', lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), current: false },
  ];

  return (
    <Box>
      <AdminPageHeader
        title={user.name}
        subtitle={user.email}
        breadcrumbs={[
          { label: 'Users', path: '/admin/identity/users' },
          { label: user.name },
        ]}
      />

      {/* User Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>

            <Stack spacing={1} sx={{ flexGrow: 1 }}>
              <Typography variant="h5" fontWeight={600}>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatusPill
                  label={user.status.toUpperCase()}
                  color={user.status === 'active' ? 'success' : 'error'}
                />
                {user.roles.map((role) => (
                  <Chip key={role} label={role.replace('_', ' ').toUpperCase()} size="small" />
                ))}
              </Stack>
            </Stack>

            <Stack spacing={1} alignItems="flex-end">
              <Typography variant="caption" color="text.secondary">
                Last Login
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {user.lastLogin
                  ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                  : 'Never'}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab icon={<User size={16} />} label="Profile" iconPosition="start" />
            <Tab icon={<Shield size={16} />} label="Access Scopes" iconPosition="start" />
            <Tab icon={<Key size={16} />} label="Permissions" iconPosition="start" />
            <Tab icon={<Clock size={16} />} label="Sessions" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Information
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        User ID
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {user.id}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {user.email}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <StatusPill
                        label={user.status.toUpperCase()}
                        color={user.status === 'active' ? 'success' : 'error'}
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Tenant
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {user.tenantName}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Roles
                  </Typography>
                  <Stack spacing={1}>
                    {user.roles.map((role) => (
                      <Chip
                        key={role}
                        label={role.replace('_', ' ').toUpperCase()}
                        icon={<Shield size={16} />}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Access Scopes Tab */}
        <TabPanel value={activeTab} index={1}>
          <Stack spacing={2}>
            {accessScopes.map((scope, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {scope.tenant}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Farms
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {scope.farms.map((farm) => (
                          <Chip key={farm} label={farm} size="small" />
                        ))}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Barns
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {scope.barns.map((barn) => (
                          <Chip key={barn} label={barn} size="small" />
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>

        {/* Effective Permissions Tab */}
        <TabPanel value={activeTab} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Resource
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Permissions
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {effectivePermissions.map((perm) => (
                  <TableRow key={perm.resource}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {perm.resource}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {perm.permissions.map((p) => (
                          <Chip key={p} label={p} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Sessions Tab */}
        <TabPanel value={activeTab} index={3}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Typography variant="body2">{session.device}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{session.location}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDistanceToNow(session.lastActive, { addSuffix: true })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {session.current ? (
                        <StatusPill label="CURRENT" color="success" size="small" />
                      ) : (
                        <StatusPill label="INACTIVE" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!session.current && (
                        <Button size="small" color="error">
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
};
