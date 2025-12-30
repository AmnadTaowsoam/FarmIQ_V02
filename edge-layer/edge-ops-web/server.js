
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 80; // Docker internal port

// --- TCP Probe Endpoint ---
app.get('/api/probe/tcp', (req, res) => {
    const { host, port } = req.query;
    
    if (!host || !port) {
        return res.status(400).json({ error: 'Missing host or port' });
    }

    const socket = new net.Socket();
    socket.setTimeout(2000); // 2s timeout

    socket.on('connect', () => {
        socket.destroy();
        res.json({ status: 'up', host, port });
    });

    socket.on('timeout', () => {
        socket.destroy();
        res.json({ status: 'down', error: 'timeout' });
    });

    socket.on('error', (err) => {
        socket.destroy();
        res.json({ status: 'down', error: err.message });
    });

    socket.connect(Number(port), String(host));
});

// --- Service Proxies ---
const services = {
    '/svc/ingress': 'http://edge-ingress-gateway:3000',
    '/svc/telemetry': 'http://edge-telemetry-timeseries:3000',
    '/svc/weighvision': 'http://edge-weighvision-session:3000',
    '/svc/media': 'http://edge-media-store:3000',
    '/svc/vision': 'http://edge-vision-inference:8000',
    '/svc/sync': 'http://edge-sync-forwarder:3000',
    '/svc/ops': 'http://edge-observability-agent:3000',
    '/svc/policy': 'http://edge-policy-sync:3000',
    '/svc/janitor': 'http://edge-retention-janitor:3000',
    '/svc/feed': 'http://edge-feed-intake:5109'
};

Object.entries(services).forEach(([path, target]) => {
    app.use(path, createProxyMiddleware({ 
        target, 
        changeOrigin: true,
        pathRewrite: { [`^${path}`]: '' } 
    }));
});

// --- Static Files ---
app.use(express.static(path.join(__dirname, 'dist')));

// --- SPA Fallback ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Edge Ops Server running on port ${PORT}`);
});
