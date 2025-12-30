import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#0f172a', // Slate 950
            paper: '#1e293b',   // Slate 800
        },
        primary: {
            main: '#10b981', // Emerald 500
            light: '#34d399',
            dark: '#059669',
        },
        secondary: {
            main: '#6366f1', // Indigo 500
        },
        text: {
            primary: '#f1f5f9', // Slate 100
            secondary: '#94a3b8', // Slate 400
        },
        divider: '#334155', // Slate 700
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 600 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#334155 #0f172a",
                    "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                        width: "8px",
                        height: "8px",
                    },
                    "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                        backgroundColor: "#334155",
                        borderRadius: "4px",
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#1e293b', // Ensure paper color consistency without overlay
                    border: '1px solid #334155',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Translucent
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid #334155',
                    boxShadow: 'none',
                },
            },
        },
    },
});
