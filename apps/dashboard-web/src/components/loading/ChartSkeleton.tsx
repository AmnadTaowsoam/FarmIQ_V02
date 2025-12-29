import { Box, Skeleton } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 400 }) => {
    return (
        <PremiumCard>
            <Box sx={{ mb: 3 }}>
                <Skeleton variant="text" width="30%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="50%" height={20} />
            </Box>
            <Skeleton 
                variant="rectangular" 
                width="100%" 
                height={height - 100} 
                sx={{ borderRadius: 2 }} 
            />
        </PremiumCard>
    );
};
