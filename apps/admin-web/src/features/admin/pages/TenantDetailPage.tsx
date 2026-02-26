import React, { useState } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, Grid, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useTenant } from '../../../api/admin/adminQueries';
import { Warehouse, Home, Server, Users } from 'lucide-react';
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

export const TenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [activeTab, setActiveTab] = useState(0);

  const { data: tenant, isLoading, error } = useTenant(tenantId || '');

  if (error) {
    return (
      <Box>
        <AdminPageHeader title="Tenant Details" />
        <Card>
          <CardContent>
            <Typography color="error">Failed to load tenant details</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading || !tenant) {
    return (
      <Box>
        <AdminPageHeader title="Tenant Details" />
        <Card>
          <CardContent>
            <Typography>Loading tenant details...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <AdminPageHeader
        title={tenant.name}
        subtitle={`Tenant ID: ${tenant.id}`}
        breadcrumbs={[
          { label: 'Tenants', path: '/tenants' },
          { label: tenant.name },
        ]}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Farms"
            value={tenant.farmCount}
            icon={<Warehouse />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Barns"
            value={tenant.barnCount}
            icon={<Home />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Devices"
            value={tenant.deviceCount}
            icon={<Server />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Users"
            value={tenant.userCount}
            icon={<Users />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Summary" />
            <Tab label="Topology" />
            <Tab label="Farms" />
            <Tab label="Barns" />
            <Tab label="Policies" />
            <Tab label="Features" />
            <Tab label="Integrations" />
            <Tab label="Audit" />
          </Tabs>
        </Box>

        {/* Summary Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tenant Information
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {tenant.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Type
                      </Typography>
                      <StatusPill
                        label={tenant.type.toUpperCase()}
                        color={
                          tenant.type === 'enterprise'
                            ? 'primary'
                            : tenant.type === 'standard'
                            ? 'info'
                            : 'default'
                        }
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <StatusPill
                        label={tenant.status.toUpperCase()}
                        color={
                          tenant.status === 'active'
                            ? 'success'
                            : tenant.status === 'suspended'
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Region
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {tenant.region}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDistanceToNow(new Date(tenant.updatedAt), { addSuffix: true })}
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
                    Resource Summary
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Warehouse size={18} />
                        <Typography variant="body2">Farms</Typography>
                      </Stack>
                      <Typography variant="h6">{tenant.farmCount}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Home size={18} />
                        <Typography variant="body2">Barns</Typography>
                      </Stack>
                      <Typography variant="h6">{tenant.barnCount}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Server size={18} />
                        <Typography variant="body2">Devices</Typography>
                      </Stack>
                      <Typography variant="h6">{tenant.deviceCount}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Users size={18} />
                        <Typography variant="body2">Users</Typography>
                      </Stack>
                      <Typography variant="h6">{tenant.userCount}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Other Tabs - Placeholders */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="body1" color="text.secondary">
            Topology visualization coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="body1" color="text.secondary">
            Farms list coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Typography variant="body1" color="text.secondary">
            Barns list coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <Typography variant="body1" color="text.secondary">
            Policies configuration coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <Typography variant="body1" color="text.secondary">
            Feature flags coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <Typography variant="body1" color="text.secondary">
            Integrations management coming soon...
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <Typography variant="body1" color="text.secondary">
            Audit trail coming soon...
          </Typography>
        </TabPanel>
      </Card>
    </Box>
  );
};
