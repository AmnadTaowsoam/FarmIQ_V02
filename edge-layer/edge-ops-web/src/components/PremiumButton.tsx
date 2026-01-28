import { Button, styled } from '@mui/material';

export const PremiumButton = styled(Button)(() => ({
  borderRadius: 10,
  padding: '10px 20px',
  fontWeight: 600,
  textTransform: 'none',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
    transform: 'translateY(-2px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

// Secondary variant (outline)
export const PremiumButtonOutline = styled(Button)(() => ({
  borderRadius: 10,
  padding: '10px 20px',
  fontWeight: 600,
  textTransform: 'none',
  background: 'transparent',
  border: '2px solid #10b981',
  color: '#10b981',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#059669',
    transform: 'translateY(-2px)',
  },
}));

// Danger variant
export const PremiumButtonDanger = styled(Button)(() => ({
  borderRadius: 10,
  padding: '10px 20px',
  fontWeight: 600,
  textTransform: 'none',
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  color: '#ffffff',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
    transform: 'translateY(-2px)',
  },
}));
