const mqtt = require('mqtt');
require('dotenv').config();

// Configuration
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'; // Use 8883 for mTLS
const TENANT_ID = 'tenant-01';
const FARM_ID = 'farm-01';
const BARN_ID = 'barn-01';
const DEVICE_COUNT = process.env.DEVICE_COUNT || 5;

const devices = [];

// Initialize Devices
for (let i = 1; i <= DEVICE_COUNT; i++) {
    devices.push({
        id: `device-sim-${String(i).padStart(3, '0')}`,
        type: 'sensor-gateway',
        status: 'active'
    });
}

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
    console.log(`Connected to MQTT Broker: ${BROKER_URL}`);
    
    // Start simulation loop
    setInterval(simulateTelemetry, 5000); // Every 5s
    setInterval(simulateEvents, 15000);   // Every 15s
});

client.on('error', (err) => {
    console.error('MQTT connection error:', err);
});

function simulateTelemetry() {
    devices.forEach(device => {
        const topic = `iot/telemetry/${TENANT_ID}/${FARM_ID}/${BARN_ID}/${device.id}/temperature`;
        const payload = {
            value: 25 + Math.random() * 5, // Random temp 25-30
            unit: 'C',
            timestamp: new Date().toISOString()
        };
        client.publish(topic, JSON.stringify(payload));
        console.log(`[TELEM] Published to ${topic}: ${payload.value.toFixed(2)}`);
    });
}

function simulateEvents() {
    // Pick random device
    const device = devices[Math.floor(Math.random() * devices.length)];
    const topic = `iot/event/${TENANT_ID}/${FARM_ID}/${BARN_ID}/${device.id}/door_opened`;
    const payload = {
        level: 'info',
        message: 'Barn door opened',
        timestamp: new Date().toISOString()
    };
    client.publish(topic, JSON.stringify(payload));
    console.log(`[EVENT] Published to ${topic}`);
}

// Keep script running
console.log(`Starting IoT Simulator for ${DEVICE_COUNT} devices...`);
