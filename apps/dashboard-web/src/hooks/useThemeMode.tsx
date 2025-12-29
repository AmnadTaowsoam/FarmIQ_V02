import { useMediaQuery } from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';

export const useThemeMode = () => {
  const { themeMode, setThemeMode } = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolvedMode = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;

  return {
    themeMode,
    setThemeMode,
    resolvedMode,
    isDark: resolvedMode === 'dark',
  };
};
