import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, TextField, Button, Autocomplete, Alert } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { UserCheck, AlertTriangle } from 'lucide-react';

export const ImpersonatePage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock user data
  const users = [
    { id: '1', name: 'John Doe', email: 'john@acmefarms.com', tenant: 'Acme Farms' },
    { id: '2', name: 'Jane Smith', email: 'jane@greenvalley.com', tenant: 'Green Valley' },
    { id: '3', name: 'Bob Johnson', email: 'bob@acmefarms.com', tenant: 'Acme Farms' },
  ];

  const handleImpersonate = () => {
    if (selectedUser) {
      console.log('Impersonating user:', selectedUser);
      // TODO: Implement impersonation logic
    }
  };

  return (
    <Box>
      <AdminPageHeader
        title="User Impersonation"
        subtitle="View the system as another user for support and debugging"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Alert severity="warning" icon={<AlertTriangle size={20} />}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Important: Read-Only Mode
                  </Typography>
                  <Typography variant="body2">
                    Impersonation is read-only. You cannot make changes on behalf of other users.
                    All impersonation sessions are logged for audit purposes.
                  </Typography>
                </Alert>

                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search User"
                      placeholder="Type to search by name or email..."
                    />
                  )}
                  onChange={(_, value) => setSelectedUser(value?.id || null)}
                  inputValue={searchQuery}
                  onInputChange={(_, value) => setSearchQuery(value)}
                />

                {selectedUser && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Selected User
                      </Typography>
                      {users
                        .filter((u) => u.id === selectedUser)
                        .map((user) => (
                          <Stack key={user.id} spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Name
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {user.name}
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
                                Tenant
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {user.tenant}
                              </Typography>
                            </Stack>
                          </Stack>
                        ))}
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!selectedUser}
                  startIcon={<UserCheck size={20} />}
                  onClick={handleImpersonate}
                >
                  Start Impersonation Session
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Guidelines
              </Typography>
              <Stack spacing={2} component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2">
                  Impersonation is read-only and cannot modify data
                </Typography>
                <Typography component="li" variant="body2">
                  All sessions are logged with timestamps
                </Typography>
                <Typography component="li" variant="body2">
                  Session expires after 30 minutes of inactivity
                </Typography>
                <Typography component="li" variant="body2">
                  Use only for legitimate support purposes
                </Typography>
                <Typography component="li" variant="body2">
                  Notify users when accessing their accounts
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
