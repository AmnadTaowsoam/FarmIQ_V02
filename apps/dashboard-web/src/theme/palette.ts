import { alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        neutral: Palette['primary'];
    }
    interface PaletteOptions {
        neutral?: PaletteOptions['primary'];
    }
}

// Global Color Tokens from Design System
export const palette = {
    primary: {
        main: '#00695C', // Teal 800
        light: '#4DB6AC', // Teal 300
        dark: '#004D40', // Teal 900
        contrastText: '#FFFFFF',
    },
    secondary: {
        main: '#F57C00', // Orange 700
        light: '#FF9800',
        dark: '#EF6C00',
        contrastText: '#FFFFFF',
    },
    neutral: {
        main: '#616161',
        light: '#9E9E9E',
        dark: '#424242',
        contrastText: '#FFFFFF',
    },
    success: {
        main: '#2E7D32',
        light: alpha('#2E7D32', 0.1), // Used for backgrounds
        dark: '#1B5E20',
    },
    warning: {
        main: '#ED6C02',
        light: alpha('#ED6C02', 0.1),
        dark: '#E65100',
    },
    error: {
        main: '#D32F2F',
        light: alpha('#D32F2F', 0.1),
        dark: '#C62828',
    },
    info: {
        main: '#0288D1',
        light: alpha('#0288D1', 0.1),
        dark: '#01579B',
    },
    text: {
        primary: '#1A2027', // Gunmetal
        secondary: '#616161',
        disabled: alpha('#1A2027', 0.38),
    },
    background: {
        default: '#F4F6F8', // Cool Gray
        paper: '#FFFFFF',
    },
    divider: alpha('#919EAB', 0.2),
};

export const darkPalette = {
    ...palette,
    mode: 'dark',
    primary: {
        main: '#4DB6AC', // Light Teal for Dark Mode
        light: '#80CBC4',
        dark: '#00695C',
        contrastText: '#000000',
    },
    background: {
        default: '#121212',
        paper: '#1E1E1E',
    },
    text: {
        primary: '#FFFFFF',
        secondary: alpha('#FFFFFF', 0.7),
        disabled: alpha('#FFFFFF', 0.5),
    },
};
