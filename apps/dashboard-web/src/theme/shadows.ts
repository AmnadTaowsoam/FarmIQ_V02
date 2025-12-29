import { Shadows } from '@mui/material/styles/shadows';

// We override the default MUI shadows
export const customShadows = [
    'none',
    '0px 4px 20px rgba(0, 0, 0, 0.05)', // 1: Card Default
    '0px 10px 35px rgba(0, 0, 0, 0.1)', // 2: Card Hover
    // ... fill standard shadows if needed, usually we reuse 1-4
    ...Array(22).fill('none') // Placeholder for now
] as Shadows;

export const shape = {
    borderRadius: 12, // 12px default
};
