import { alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        neutral: Palette['primary'];
        accent: {
            gold: string;
            coral: string;
            teal: string;
            purple: string;
        };
        surface: {
            glass: string;
            elevated: string;
            sunken: string;
            overlay: string;
        };
    }
    interface PaletteOptions {
        neutral?: PaletteOptions['primary'];
        accent?: {
            gold: string;
            coral: string;
            teal: string;
            purple: string;
        };
        surface?: {
            glass: string;
            elevated: string;
            sunken: string;
            overlay: string;
        };
    }
    interface PaletteColor {
        gradient?: string;
    }
    interface SimplePaletteColorOptions {
        gradient?: string;
    }
}

// Global Color Tokens from Design System - Premium Agricultural Theme
export const palette = {
    primary: {
        main: '#059669',      // Emerald 600 - Vibrant Green
        light: '#34D399',     // Emerald 400
        dark: '#047857',      // Emerald 700
        contrastText: '#FFFFFF',
        gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    },
    secondary: {
        main: '#1E293B',      // Slate 800 - Premium Dark
        light: '#334155',
        dark: '#0F172A',
        contrastText: '#FFFFFF',
        gradient: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
    },
    accent: {
        gold: '#F59E0B',
        coral: '#F97316',
        teal: '#14B8A6',
        purple: '#8B5CF6',
    },
    neutral: {
        main: '#64748B',      // Slate 500
        light: '#94A3B8',
        dark: '#334155',
        contrastText: '#FFFFFF',
    },
    success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
        gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    },
    warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    },
    error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#B91C1C',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    },
    info: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    },
    text: {
        primary: '#0F172A',   // Slate 900
        secondary: '#475569', // Slate 600
        disabled: alpha('#0F172A', 0.38),
    },
    background: {
        default: '#F8FAFC',   // Slate 50
        paper: '#FFFFFF',
    },
    surface: {
        glass: 'rgba(255, 255, 255, 0.72)',
        elevated: '#FFFFFF',
        sunken: '#F1F5F9',
        overlay: 'rgba(15, 23, 42, 0.4)',
    },
    divider: alpha('#64748B', 0.12),
    action: {
        hover: alpha('#059669', 0.04),
        selected: alpha('#059669', 0.08),
        disabled: alpha('#0F172A', 0.26),
        disabledBackground: alpha('#0F172A', 0.12),
        focus: alpha('#059669', 0.12),
    },
};

export const darkPalette = {
    ...palette,
    mode: 'dark',
    primary: {
        main: '#10B981',      // Emerald 500
        light: '#34D399',
        dark: '#059669',
        contrastText: '#0F172A',
        gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    },
    secondary: {
        main: '#94A3B8',      // Slate 400
        light: '#CBD5E1',
        dark: '#475569',
        contrastText: '#0F172A',
        gradient: 'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)',
    },
    background: {
        default: '#0F172A',   // Slate 900
        paper: '#1E293B',     // Slate 800
    },
    text: {
        primary: '#F8FAFC',   // Slate 50
        secondary: '#94A3B8', // Slate 400
        disabled: alpha('#F8FAFC', 0.38),
    },
    surface: {
        glass: 'rgba(30, 41, 59, 0.72)',
        elevated: '#1E293B',
        sunken: '#020617',
        overlay: 'rgba(0, 0, 0, 0.6)',
    },
    divider: alpha('#94A3B8', 0.12),
    action: {
        hover: alpha('#10B981', 0.08),
        selected: alpha('#10B981', 0.16),
        disabled: alpha('#F8FAFC', 0.3),
        disabledBackground: alpha('#F8FAFC', 0.12),
        focus: alpha('#10B981', 0.12),
    },
};
