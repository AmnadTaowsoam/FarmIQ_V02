import React from 'react';
import { Box } from '@mui/material';
import { Shield } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const AdminLandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box data-testid="page-admin">
      <PageHeader title="Admin" subtitle="Tenant administration and access control" />
      <EmptyState
        icon={<Shield size={32} />}
        title="Manage organizations"
        description="Review tenants, users, devices, and audit logs."
        actionLabel="View Tenants"
        onAction={() => navigate('/admin/tenants')}
      />
    </Box>
  );
};
