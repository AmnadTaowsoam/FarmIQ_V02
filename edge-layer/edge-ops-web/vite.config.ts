
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import net from 'net';

// Custom middleware for TCP checking in Dev mode
const tcpProbePlugin = () => ({
    name: 'tcp-probe',
    configureServer(server) {
        server.middlewares.use('/api/probe/tcp', (req, res, next) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const host = url.searchParams.get('host');
            const port = url.searchParams.get('port');

            if (!host || !port) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing host or port' }));
                return;
            }

            const socket = new net.Socket();
            socket.setTimeout(2000);

            socket.on('connect', () => {
                socket.destroy();
                res.end(JSON.stringify({ status: 'up', host, port }));
            });

            socket.on('timeout', () => {
                socket.destroy();
                res.end(JSON.stringify({ status: 'down', error: 'timeout' }));
            });

            socket.on('error', (err) => {
                socket.destroy();
                res.end(JSON.stringify({ status: 'down', error: err.message }));
            });

            socket.connect(Number(port), String(host));
        });
    }
});

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tcpProbePlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5110,
        host: true, // Listen on all addresses for Docker
    }
});
