import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  TextField,
  Button,
} from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { formatDistanceToNow } from 'date-fns';

export const BillingDashboardPage: React.FC = () => {
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const response = await apiClient.get(`/api/v1/billing/usage/aggregated`, {
        params: { tenantId: selectedTenantId },
      });
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const { data: invoices } = useQuery({
    queryKey: ['billing', 'invoices', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const response = await apiClient.get(`/api/v1/billing/invoices`, {
        params: { tenantId: selectedTenantId },
      });
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const response = await apiClient.get(`/api/v1/billing/subscriptions/${selectedTenantId}`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  return (
    <Box>
      <AdminPageHeader
        title="Billing Dashboard"
        subtitle="View usage metrics, invoices, and subscriptions"
      />

      <Stack spacing={3} sx={{ mt: 3 }}>
        <TextField
          label="Select Tenant"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          fullWidth
          required
        />

        {subscription && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Plan
                  </Typography>
                  <Typography variant="h6">{subscription.plan}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <StatusPill
                    label={subscription.status}
                    color={subscription.status === 'active' ? 'success' : 'error'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Billing Cycle
                  </Typography>
                  <Typography variant="h6">{subscription.billingCycle}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {usage && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Summary
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(usage).map(([key, value]: [string, any]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <Typography variant="body2" color="text.secondary">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="h6">{value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {invoices && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoices
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Number</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.data?.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {invoice.currency} {invoice.amount}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            label={invoice.status}
                            color={
                              invoice.status === 'paid'
                                ? 'success'
                                : invoice.status === 'overdue'
                                ? 'error'
                                : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};
