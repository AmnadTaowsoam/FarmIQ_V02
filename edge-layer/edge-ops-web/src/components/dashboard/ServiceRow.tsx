import { Box, Typography, Paper } from '@mui/material';
import { EdgeServiceStatus } from '@/types';
import { Activity } from 'lucide-react';

interface ServiceRowProps {
  service: EdgeServiceStatus;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({ service }) => {
  const isUp = service.status === 'up';
  
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        p: 2, 
        borderRadius: 2, 
        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
        borderColor: 'divider',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: 'rgba(15, 23, 42, 0.6)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ position: 'relative', display: 'flex', width: 12, height: 12 }}>
          <Box 
            component="span"
            sx={{ 
              position: 'absolute', 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              bgcolor: isUp ? 'success.main' : 'error.main', 
              opacity: 0.75,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              '@keyframes ping': {
                '75%, 100%': { transform: 'scale(2)', opacity: 0 }
              }
            }} 
          />
          <Box 
            component="span"
            sx={{ 
              position: 'relative', 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              bgcolor: isUp ? 'success.main' : 'error.main' 
            }} 
          />
        </Box>
        <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
          {service.name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {service.latencyMs !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
            <Activity size={12} style={{ marginRight: 4 }} />
            {service.latencyMs}ms
          </Box>
        )}
        <Box 
          sx={{ 
            fontSize: '0.7rem', 
            px: 1, 
            py: 0.25, 
            borderRadius: 0.5, 
            bgcolor: isUp ? 'rgba(5, 46, 22, 0.5)' : 'rgba(69, 10, 10, 0.5)', 
            color: isUp ? 'success.light' : 'error.light', 
            fontFamily: 'monospace', 
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}
        >
          {service.status}
        </Box>
      </Box>
    </Paper>
  );
};
