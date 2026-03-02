import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// #region agent log
const logPath = '/app/.cursor/debug.log';
const logToFile = (data: any) => {
  try {
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify({...data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1'}) + '\n');
  } catch (e) {}
};
// #endregion

// #region agent log
try {
  const packageJsonPath = '/app/package.json';
  const nodeModulesPath = '/app/node_modules';
  const packageJson = fs.existsSync(packageJsonPath) ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) : null;
  const hasNodeModules = fs.existsSync(nodeModulesPath);
  const deps = packageJson?.dependencies || {};
  const hasLucide = deps['lucide-react'] || fs.existsSync(path.join(nodeModulesPath, 'lucide-react'));
  const hasTanstack = deps['@tanstack/react-query'] || fs.existsSync(path.join(nodeModulesPath, '@tanstack/react-query'));
  const hasDateFns = deps['date-fns'] || fs.existsSync(path.join(nodeModulesPath, 'date-fns'));
  logToFile({location: 'vite.config.ts:init', message: 'Vite config initialization', data: {hasPackageJson: !!packageJson, hasNodeModules, hasLucide, hasTanstack, hasDateFns, depsCount: Object.keys(deps).length}, hypothesisId: 'A'});
} catch (e) {
  logToFile({location: 'vite.config.ts:init', message: 'Vite config init error', data: {error: String(e)}, hypothesisId: 'A'});
}
// #endregion

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5143,
    host: true,
    proxy: {
      '/api/v1/identity/rbac': {
        target: 'http://127.0.0.1:5120',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/v1\/identity/, '/api/v1'),
      },
      '/api': {
        target: 'http://127.0.0.1:5125',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', '@mui/material'],
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  }
});
