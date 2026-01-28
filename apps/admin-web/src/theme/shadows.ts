import { Shadows } from '@mui/material/styles';

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

export const typography = {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2,
    },
    h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
    },
    h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.4,
    },
    h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
    },
    h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.5,
    },
    h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
    },
    body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
    },
    button: {
        fontWeight: 600,
        textTransform: 'none' as const,
    },
};
