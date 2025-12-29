import { TypographyOptions } from '@mui/material/styles/createTypography';

// Font Family: Inter is preferred
export const typography: TypographyOptions = {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 700, fontSize: '1.75rem' },
    h4: { fontWeight: 700, fontSize: '1.5rem' },
    h5: { fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.57 },
    button: { fontWeight: 600, textTransform: 'none' }, // No uppercase buttons
};
