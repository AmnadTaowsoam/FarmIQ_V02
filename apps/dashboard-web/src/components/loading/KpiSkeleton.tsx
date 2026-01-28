import { Box, Skeleton, alpha, useTheme, styled } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';

const ShimmerBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: alpha(theme.palette.action.hover, 0.05),
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transform: 'translateX(-100%)',
    backgroundImage: `linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0)
    )`,
    animation: 'shimmer 2s infinite',
  },
  '@keyframes shimmer': {
    '100%': {
      transform: 'translateX(100%)',
    },
  },
}));

export const KpiSkeleton: React.FC = () => {
    const theme = useTheme();
    
    return (
        <PremiumCard sx={{ height: 160, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ width: '60%' }}>
                    <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1, bgcolor: alpha(theme.palette.text.primary, 0.1) }} />
                    <Skeleton variant="rectangular" width="80%" height={48} sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.1) }} />
                </Box>
                <Skeleton variant="circular" width={48} height={48} sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) }} />
            </Box>
            <Box sx={{ mt: 'auto' }}>
                <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5, bgcolor: alpha(theme.palette.text.primary, 0.05) }} />
            </Box>
            
            {/* Shimmer Overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.background.paper, 0.5)}, transparent)`,
                    transform: 'skewX(-20deg) translateX(-150%)',
                    animation: 'shimmer 1.5s infinite linear',
                    '@keyframes shimmer': {
                        '0%': { transform: 'skewX(-20deg) translateX(-150%)' },
                        '100%': { transform: 'skewX(-20deg) translateX(150%)' }
                    }
                }}
            />
        </PremiumCard>
    );
};
