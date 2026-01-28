import { TypographyOptions } from '@mui/material/styles/createTypography';

// Premium Admin Typography System
// Font Family: Inter (System UI fallback)
export const typography: TypographyOptions = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
        fontWeight: 800,
        fontSize: '2.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
    },
    h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
    },
    h3: {
        fontWeight: 700,
        fontSize: '1.75rem',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
    },
    h4: {
        fontWeight: 700,
        fontSize: '1.5rem',
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
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
        lineHeight: 1.6,
    },
    subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
    },
    subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.57,
    },
    caption: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
    },
    overline: {
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    button: {
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.02em',
    },
};
