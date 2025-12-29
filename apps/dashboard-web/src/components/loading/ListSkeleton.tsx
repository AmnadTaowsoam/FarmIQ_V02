import { Box, Skeleton, Divider } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
    return (
        <PremiumCard noPadding sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="60%" height={16} />
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {Array.from({ length: rows }).map((_, i) => (
                    <Box key={i}>
                        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ width: '70%' }}>
                                <Skeleton variant="text" width="80%" height={20} sx={{ mb: 0.5 }} />
                                <Skeleton variant="text" width="40%" height={16} />
                            </Box>
                            <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 6 }} />
                        </Box>
                        {i < rows - 1 && <Divider />}
                    </Box>
                ))}
            </Box>
        </PremiumCard>
    );
};
