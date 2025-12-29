import { Box, Skeleton } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';

export const KpiSkeleton: React.FC = () => {
    return (
        <PremiumCard sx={{ height: 160, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ width: '60%' }}>
                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                    <Skeleton variant="rectangular" width="80%" height={40} sx={{ borderRadius: 1 }} />
                </Box>
                <Skeleton variant="circular" width={44} height={44} sx={{ borderRadius: 2.5 }} />
            </Box>
            <Box sx={{ mt: 'auto' }}>
                <Skeleton variant="text" width="50%" height={16} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="30%" height={16} />
            </Box>
        </PremiumCard>
    );
};
