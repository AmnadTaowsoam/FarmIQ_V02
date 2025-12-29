import React, { useMemo } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, StyledEngineProvider, alpha } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { palette, darkPalette } from './palette';
import { typography } from './typography';
import { customShadows, shape } from './shadows';
import { useThemeMode } from '../hooks/useThemeMode';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { resolvedMode } = useThemeMode();
  const isDarkMode = resolvedMode === 'dark';
  const activePalette = isDarkMode ? darkPalette : palette;

  const themeOptions = useMemo(
    () => ({
      palette: activePalette,
      typography,
      shape,
      shadows: customShadows,
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateY(10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
            body: {
              '& #root': {
                animation: 'fadeIn 0.4s ease-out',
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isDarkMode 
                ? alpha(darkPalette.background.default, 0.8) 
                : alpha(palette.background.default, 0.8),
              backdropFilter: 'blur(8px)',
              borderBottom: `1px solid ${activePalette.divider}`,
              color: activePalette.text.primary,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: 'none',
              },
              '&:focus-visible': {
                outline: `2px solid ${activePalette.primary.main}`,
                outlineOffset: 1,
              },
            },
            contained: {
              color: '#FFFFFF',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: customShadows[1],
              borderRadius: shape.borderRadius,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: customShadows[2],
              },
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              margin: '2px 8px',
              transition: 'all 0.2s ease-in-out',
              '&:focus-visible': {
                outline: `2px solid ${activePalette.primary.main}`,
                outlineOffset: -2,
              },
              '&.Mui-selected': {
                backgroundColor: alpha(activePalette.primary.main, 0.08),
                color: activePalette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(activePalette.primary.main, 0.12),
                },
                '& .MuiListItemIcon-root': {
                  color: activePalette.primary.main,
                },
              },
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paperAnchorRight: {
              top: 72,
              height: 'calc(100% - 72px)',
            },
            paper: {
              transition: 'transform 0.2s ease',
            },
          },
        },
      },
    }),
    [isDarkMode]
  );

  const theme = createTheme(themeOptions as any);

  return (
    <StyledEngineProvider injectFirst>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </StyledEngineProvider>
  );
};
