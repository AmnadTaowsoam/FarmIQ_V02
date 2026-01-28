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

// Admin Console Color Tokens - Premium Gold Theme
export const palette = {
    primary: {
        main: '#B45309',      // Amber 700
        light: '#D97706',     // Amber 600
        dark: '#78350F',      // Amber 900
        contrastText: '#FFFFFF',
        gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
    },
    secondary: {
        main: '#1E293B',      // Slate 800
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
        main: '#059669',
        light: '#34D399',
        dark: '#047857',
        gradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    },
    warning: {
        main: '#D97706',
        light: '#FBBF24',
        dark: '#92400E',
        gradient: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    },
    error: {
        main: '#DC2626',
        light: '#F87171',
        dark: '#991B1B',
        gradient: 'linear-gradient(135deg, #DC2626 0%, #F87171 100%)',
    },
    info: {
        main: '#2563EB',
        light: '#60A5FA',
        dark: '#1E40AF',
        gradient: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
    },
    text: {
        primary: '#0F172A',   // Slate 900
        secondary: '#475569', // Slate 600
        disabled: alpha('#0F172A', 0.38),
    },
    background: {
        default: '#F1F5F9',   // Slate 100 - Slightly darker than dashboard for admin feel
        paper: '#FFFFFF',
    },
    surface: {
        glass: 'rgba(255, 255, 255, 0.72)',
        elevated: '#FFFFFF',
        sunken: '#E2E8F0',
        overlay: 'rgba(15, 23, 42, 0.5)',
    },
    divider: alpha('#64748B', 0.12),
    action: {
        hover: alpha('#B45309', 0.04),
        selected: alpha('#B45309', 0.08),
        disabled: alpha('#0F172A', 0.26),
        disabledBackground: alpha('#0F172A', 0.12),
        focus: alpha('#B45309', 0.12),
    },
};

export const darkPalette = {
    ...palette,
    mode: 'dark',
    primary: {
        main: '#F59E0B',      // Amber 500
        light: '#FBBF24',
        dark: '#B45309',
        contrastText: '#0F172A',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    },
    secondary: {
        main: '#94A3B8',      // Slate 400
        light: '#CBD5E1',
        dark: '#475569',
        contrastText: '#0F172A',
        gradient: 'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%)',
    },
    background: {
        default: '#020617',   // Slate 950 - Deeper dark for admin
        paper: '#0F172A',     // Slate 900
    },
    text: {
        primary: '#F8FAFC',   // Slate 50
        secondary: '#94A3B8', // Slate 400
        disabled: alpha('#F8FAFC', 0.38),
    },
    surface: {
        glass: 'rgba(15, 23, 42, 0.72)',
        elevated: '#1E293B',
        sunken: '#000000',
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
    divider: alpha('#94A3B8', 0.12),
    action: {
        hover: alpha('#F59E0B', 0.08),
        selected: alpha('#F59E0B', 0.16),
        disabled: alpha('#F8FAFC', 0.3),
        disabledBackground: alpha('#F8FAFC', 0.12),
        focus: alpha('#F59E0B', 0.12),
    },
};
