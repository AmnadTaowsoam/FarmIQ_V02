import React from 'react';
import { Box, Button, Card, CardContent, Container, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import { apiClient } from '../../api';
import { useQuery } from '@tanstack/react-query';
import { useActiveContext } from '../../contexts/ActiveContext';

// Helper to fetch and display data
const EndpointTester = ({ title, queryKey, queryFn }: { title: string, queryKey: string[], queryFn: () => Promise<any> }) => {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey,
    queryFn,
    enabled: false, // Only fetch on button click
  });

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => refetch()} 
            disabled={isFetching}
            startIcon={isFetching ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isFetching ? 'Fetching...' : 'Test Endpoint'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {/* @ts-ignore - simplistic error handling */}
            {error.message || 'Error occurred'}
          </Alert>
        )}

        {data && (
          <Box sx={{ 
            bgcolor: '#f5f5f5', 
            p: 2, 
            borderRadius: 1, 
            maxHeight: 200, 
            overflow: 'auto',
            fontSize: '0.75rem',
            fontFamily: 'monospace'
          }}>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default function ApiPlayground() {
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const from = timeRange.start.toISOString();
  const to = timeRange.end.toISOString();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        API Smoke Test Playground
      </Typography>
      
      <Grid container spacing={3}>
        {/* Auth / Me */}
        <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="Auth: Me / Tenants" 
            queryKey={['tenants']}
            queryFn={() => apiClient.get('/api/v1/tenants').then((r) => r.data)}
          />
        </Grid>

         {/* Farms */}
         <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="Master Data: Farms" 
            queryKey={['farms']}
            queryFn={() =>
              apiClient
                .get('/api/v1/farms', { params: tenantId ? { tenantId } : undefined })
                .then((r) => r.data)
            }
          />
        </Grid>

        {/* Dashboard Overview */}
        <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="Dashboard Overview" 
            queryKey={['dashboard-overview']}
            queryFn={() =>
              apiClient
                .get('/api/v1/dashboard/overview', {
                  params: tenantId
                    ? { tenantId, farmId: farmId || undefined, barnId: barnId || undefined, timeRange: timeRange.preset }
                    : undefined,
                })
                .then((r) => r.data)
            }
          />
        </Grid>

        {/* Telemetry Readings (latest-ish) */}
        <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="Telemetry: Readings" 
            queryKey={['telemetry-readings']}
            queryFn={() =>
              apiClient
                .get('/api/v1/telemetry/readings', {
                  params: tenantId
                    ? {
                        tenantId,
                        farmId: farmId || undefined,
                        barnId: barnId || undefined,
                        from,
                        to,
                        limit: 5,
                      }
                    : undefined,
                })
                .then((r) => r.data)
            }
          />
        </Grid>

        {/* Sessions */}
        <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="WeighVision Sessions" 
            queryKey={['sessions']}
            queryFn={() =>
              apiClient
                .get('/api/v1/weighvision/sessions', {
                  params: tenantId
                    ? { tenantId, farmId: farmId || undefined, barnId: barnId || undefined, from, to, limit: 5 }
                    : undefined,
                })
                .then((r) => r.data)
            }
          />
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={6} lg={4}>
          <EndpointTester 
            title="Alerts (Dashboard)" 
            queryKey={['alerts']}
            queryFn={() =>
              apiClient
                .get('/api/v1/dashboard/alerts', { params: tenantId ? { tenantId, limit: 25 } : undefined })
                .then((r) => r.data)
            }
          />
        </Grid>
      </Grid>
    </Container>
  );
}
