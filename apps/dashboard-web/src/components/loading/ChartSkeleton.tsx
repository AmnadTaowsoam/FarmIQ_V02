import { Box, Skeleton, alpha, useTheme } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 400 }) => {
    const theme = useTheme();

    return (
        <PremiumCard>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box width="40%">
                    <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1, bgcolor: alpha(theme.palette.text.primary, 0.1) }} />
                    <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1) }} />
                </Box>
                <Box display="flex" gap={2}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                </Box>
            </Box>
            
            <Box sx={{ position: 'relative', height: height - 100, width: '100%' }}>
                {/* Y-Axis lines */}
                {[...Array(5)].map((_, i) => (
                    <Box 
                        key={i} 
                        sx={{ 
                            position: 'absolute', 
                            top: `${i * 25}%`, 
                            left: 0, 
                            right: 0, 
                            height: 1, 
                            bgcolor: alpha(theme.palette.divider, 0.5) 
                        }} 
                    />
                ))}
                
                {/* Simulated Chart Area */}
                <Skeleton 
                    variant="rectangular" 
                    width="100%" 
                    height="100%" 
                    sx={{ 
                        borderRadius: 2, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'scaleY(0.8)',
                        transformOrigin: 'bottom'
                    }} 
                />
            </Box>
        </PremiumCard>
    );
};
