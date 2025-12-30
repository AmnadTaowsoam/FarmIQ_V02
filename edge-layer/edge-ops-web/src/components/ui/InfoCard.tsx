import { Paper, Box, Typography } from '@mui/material';

interface InfoCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  alert?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, value, subValue, icon, alert }) => {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2.5, 
        borderRadius: 3, 
        backgroundColor: alert ? 'rgba(69, 10, 10, 0.2)' : 'rgba(15, 23, 42, 0.5)', 
        borderColor: alert ? 'rgba(127, 29, 29, 0.5)' : 'divider',
        backdropFilter: 'blur(4px)',
        boxShadow: 'sm',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'text.secondary'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary', 
            fontWeight: 500, 
            textTransform: 'uppercase', 
            letterSpacing: 1 
          }}
        >
          {title}
        </Typography>
        {icon}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
        {value}
      </Typography>
      {subValue && (
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            mt: 0.5, 
            color: alert ? 'error.main' : 'text.secondary', 
            fontWeight: alert ? 'bold' : 'normal' 
          }}
        >
          {subValue}
        </Typography>
      )}
    </Paper>
  );
};
