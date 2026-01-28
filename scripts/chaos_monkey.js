const { exec } = require('child_process');

const TARGET_CONTAINERS = [
    'farmiq-cloud-identity-access',
    'farmiq-cloud-ingestion', 
    'farmiq-cloud-api-gateway-bff'
];

const INTERVAL_MS = 30000; // 30 seconds

function log(msg) {
    console.log(`[CHAOS MONKEY] ${new Date().toISOString()} - ${msg}`);
}

function getRandomContainer() {
    const idx = Math.floor(Math.random() * TARGET_CONTAINERS.length);
    return TARGET_CONTAINERS[idx];
}

function killContainer(containerName) {
    log(`🔫 Targeting ${containerName}...`);
    exec(`docker restart ${containerName}`, (error, stdout, stderr) => {
        if (error) {
            log(`❌ Failed to restart ${containerName}: ${error.message}`);
            return;
        }
        log(`✅ Successfully restarted ${containerName}`);
    });
}

function startChaos() {
    log('👿 Chaos Monkey Started! Press Ctrl+C to stop.');
    setInterval(() => {
        const target = getRandomContainer();
        killContainer(target);
    }, INTERVAL_MS);
}

startChaos();
