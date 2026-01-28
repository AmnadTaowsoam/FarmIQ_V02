import { Shadows } from '@mui/material/styles/shadows';

// Premium shadows for Agricultural Green Theme
export const customShadows = [
    'none',
    '0px 4px 24px rgba(0, 0, 0, 0.06)', // 1: Card Default
    '0px 12px 40px rgba(0, 0, 0, 0.12)', // 2: Card Hover
    '0px 16px 48px rgba(0, 0, 0, 0.15)', // 3: Elevated Card
    '0px 4px 16px rgba(76, 175, 80, 0.4)', // 4: Primary Button Hover
    '0px 8px 24px rgba(33, 150, 243, 0.3)', // 5: Secondary Button Hover
    ...Array(18).fill('none') // Placeholder for now
] as Shadows;

export const shape = {
    borderRadius: 4, // 4px for sharp, minimal look
};
