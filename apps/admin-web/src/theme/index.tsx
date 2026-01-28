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
              padding: '8px 16px',
              transition: 'all 0.2s ease',
              backgroundImage: 'none',
              '&:hover': {
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transform: 'translateY(-1px)',
                backgroundImage: 'none',
              },
              '&:focus-visible': {
                outline: `2px solid ${activePalette.primary.main}`,
                outlineOffset: 2,
              },
            },
            contained: {
              backgroundColor: activePalette.primary.main,
              color: '#FFFFFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              '&:hover': {
                backgroundColor: activePalette.primary.dark,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              },
            },
            outlined: {
              backgroundImage: 'none',
              color: activePalette.primary.main,
              borderColor: activePalette.primary.main,
              '&:hover': {
                backgroundImage: 'none',
                backgroundColor: alpha(activePalette.primary.main, 0.04),
                borderColor: activePalette.primary.dark,
              }
            },
            text: {
                backgroundImage: 'none',
                color: activePalette.primary.main,
                boxShadow: 'none',
                '&:hover': {
                    backgroundImage: 'none',
                    backgroundColor: alpha(activePalette.primary.main, 0.05),
                    boxShadow: 'none',
                    transform: 'none',
                }
            }
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDarkMode 
                ? alpha(darkPalette.background.paper, 0.8) 
                : alpha(palette.background.paper, 0.85),
              backdropFilter: 'blur(12px) saturate(180%)',
              border: `1px solid ${alpha(activePalette.divider, 0.1)}`,
              overflow: 'hidden',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: isDarkMode ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)' : '0 8px 32px 0 rgba(11, 59, 36, 0.08)',
              borderRadius: shape.borderRadius,
              overflow: 'hidden',
              backgroundColor: isDarkMode 
                ? alpha(darkPalette.background.paper, 0.6) 
                : alpha(palette.background.paper, 0.7),
              backdropFilter: 'blur(16px)',
              border: `1px solid ${alpha(activePalette.divider, 0.1)}`,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: isDarkMode ? '0 12px 48px 0 rgba(0, 0, 0, 0.6)' : '0 12px 48px 0 rgba(31, 38, 135, 0.15)',
                backgroundColor: isDarkMode 
                    ? alpha(darkPalette.background.paper, 0.7) 
                    : alpha(palette.background.paper, 0.8),
              },
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              margin: '4px 12px',
              padding: '10px 16px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:focus-visible': {
                outline: `2px solid ${activePalette.primary.main}`,
                outlineOffset: -2,
              },
              '&.Mui-selected': {
                backgroundImage: 'none',
                backgroundColor: alpha(activePalette.primary.main, 0.08),
                color: activePalette.primary.main,
                fontWeight: 600,
                borderLeft: `3px solid ${activePalette.primary.main}`,
                '&:hover': {
                  backgroundColor: alpha(activePalette.primary.main, 0.12),
                },
                '& .MuiListItemIcon-root': {
                  color: activePalette.primary.main,
                },
              },
              '&:hover': {
                transform: 'translateX(6px)',
                backgroundColor: alpha(activePalette.primary.main, 0.05),
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
              transition: 'transform 0.3s ease',
            },
          },
        },
        MuiDataGrid: {
          styleOverrides: {
            root: {
              border: 'none',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: isDarkMode ? alpha(activePalette.background.paper, 0.4) : alpha(activePalette.background.paper, 0.6),
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: alpha(activePalette.primary.main, 0.08),
                borderBottom: `1px solid ${activePalette.divider}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: activePalette.text.secondary,
              },
              '& .MuiDataGrid-columnHeader': {
                '&:focus': { outline: 'none' },
                '&:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(activePalette.divider, 0.5)}`,
                fontSize: '0.875rem',
                color: activePalette.text.primary,
                '&:focus': { outline: 'none' },
                '&:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-row': {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: alpha(activePalette.primary.main, 0.04),
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(activePalette.primary.main, 0.08),
                  '&:hover': {
                    backgroundColor: alpha(activePalette.primary.main, 0.12),
                  },
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `1px solid ${activePalette.divider}`,
                backgroundColor: isDarkMode ? alpha(activePalette.background.paper, 0.8) : alpha(activePalette.background.paper, 0.95),
                backdropFilter: 'blur(8px)',
              },
              '& .MuiDataGrid-pinnedColumns': {
                backgroundColor: isDarkMode
                  ? alpha(activePalette.background.paper, 0.95)
                  : alpha(activePalette.background.paper, 0.98),
                boxShadow: '4px 0 16px rgba(0, 0, 0, 0.05)',
              },
              '& .MuiDataGrid-pinnedColumns--left': {
                borderRight: `1px solid ${activePalette.divider}`,
              },
              '& .MuiDataGrid-pinnedColumns--right': {
                borderLeft: `1px solid ${activePalette.divider}`,
              },
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
