import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { PremiumCard } from '../common/PremiumCard';
import { BarChart3 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  height?: number;
  children?: React.ReactNode;
  loading?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ 
  title, 
  subtitle, 
  height = 300, 
  children,
  loading = false
}) => {
  const theme = useTheme();

  return (
    <PremiumCard title={title} subtitle={subtitle}>
      <Box sx={{ 
          height, 
          width: '100%', 
          position: 'relative',
          mt: children ? 2 : 0,
          display: 'flex',
          flexDirection: 'column'
      }}>
          {loading ? (
              <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  bgcolor: alpha(theme.palette.text.primary, 0.02),
                  borderRadius: 2,
                  gap: 1
              }}>
                  <Box className="shimmer" sx={{ width: '80%', height: '20%', bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box className="shimmer" sx={{ width: '60%', height: '15%', bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box className="shimmer" sx={{ width: '70%', height: '25%', bgcolor: 'action.hover', borderRadius: 1 }} />
              </Box>
          ) : children ? children : (
             <Box sx={{ 
                 height: '100%', 
                 display: 'flex', 
                 flexDirection: 'column',
                 alignItems: 'center', 
                 justifyContent: 'center', 
                 bgcolor: alpha(theme.palette.text.primary, 0.02),
                 borderRadius: 3,
                 border: '1px dashed',
                 borderColor: 'divider',
                 p: 3,
                 textAlign: 'center'
             }}>
                 <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2, mb: 1.5 }}>
                    <BarChart3 size={24} />
                 </Box>
                 <Typography variant="body2" fontWeight="700" color="text.primary">No Visualization Data</Typography>
                 <Typography variant="caption" color="text.secondary">Select a specific context or time range to populate this chart.</Typography>
             </Box>
          )}
      </Box>
    </PremiumCard>
  );
};
