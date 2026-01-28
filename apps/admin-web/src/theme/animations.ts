import { keyframes } from '@mui/material';

// Keyframes
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(180, 83, 9, 0.4);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(180, 83, 9, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(180, 83, 9, 0);
  }
`;

// Animation Presets (for sx prop)
export const animations = {
  fadeIn: `${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  slideInRight: `${slideInRight} 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  slideInLeft: `${slideInLeft} 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  scaleIn: `${scaleIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  pulse: `${pulse} 2s infinite`,
};
