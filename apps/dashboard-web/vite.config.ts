import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

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
  const hasI18nextBrowser = deps['i18next-browser-languagedetector'] || fs.existsSync(path.join(nodeModulesPath, 'i18next-browser-languagedetector'));
  logToFile({location: 'vite.config.ts:init', message: 'Vite config initialization', data: {hasPackageJson: !!packageJson, hasNodeModules, hasI18nextBrowser, depsCount: Object.keys(deps).length}, hypothesisId: 'A'});
} catch (e) {
  logToFile({location: 'vite.config.ts:init', message: 'Vite config init error', data: {error: String(e)}, hypothesisId: 'A'});
}
// #endregion

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 5135,
    headers: {
      // Security headers for dev server
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // CSP - allow inline scripts for Vite HMR in dev
      'Content-Security-Policy': process.env.NODE_ENV === 'production'
        ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https: chrome-extension:; frame-src 'self' chrome-extension:;",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5125',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material', 'recharts'],
        },
      },
    },
  },
});
