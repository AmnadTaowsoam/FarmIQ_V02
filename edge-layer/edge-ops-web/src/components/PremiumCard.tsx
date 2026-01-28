import { Card, styled } from '@mui/material';

export const PremiumCard = styled(Card)(() => ({
  background: 'rgba(30, 41, 59, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
  },
}));

// Light mode variant
export const PremiumCardLight = styled(Card)(() => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: '1px solid rgba(0, 0, 0, 0.1)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
  },
}));
