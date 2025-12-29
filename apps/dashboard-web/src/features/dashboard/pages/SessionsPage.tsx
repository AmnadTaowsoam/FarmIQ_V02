import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SessionsPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <Box>
            <PageHeader title="WeighVision Sessions" subtitle="Manage weighing sessions and inference results" />
            <PremiumCard>
                <EmptyState 
                    icon={<Camera size={32} />} 
                    title="No Recent Sessions" 
                    description="Connect a WeighVision camera to start capturing data." 
                    actionLabel="New Session"
                    onAction={() => navigate('/weighvision/sessions')}
                />
            </PremiumCard>
        </Box>
    );
};
