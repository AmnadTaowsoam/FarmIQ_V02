#!/usr/bin/env node

/**
 * Enhanced IoT Simulator for FarmIQ Edge-Layer Testing
 *
 * This simulator simulates IoT devices sending data to the Edge-Layer via MQTT.
 * It covers all major data types: telemetry, weighvision sessions, and feed events.
 *
 * Usage:
 *   node iot-simulator-enhanced.js [options]
 *
 * Options:
 *   --broker <url>      MQTT broker URL (default: mqtt://localhost:5100)
 *   --tenant <id>       Tenant ID (default: t-001)
 *   --farm <id>         Farm ID (default: f-001)
 *   --barn <id>         Barn ID (default: b-001)
 *   --devices <count>   Number of devices (default: 3)
 *   --duration <sec>    Test duration in seconds (default: 60)
 *   --telemetry         Enable telemetry simulation (default: true)
 *   --weighvision       Enable weighvision simulation (default: true)
 *   --feed              Enable feed simulation (default: true)
 *   --help              Show help
 */

const mqtt = require('mqtt');
const { randomUUID } = require('crypto');

// Default configuration
const DEFAULT_CONFIG = {
  broker: 'mqtt://localhost:5100',
  tenant: 't-001',
  farm: 'f-001',
  barn: 'b-001',
  station: 'st-01',
  devices: 3,
  duration: 60,
  telemetry: true,
  weighvision: true,
  feed: true
};

// Parse command line arguments
const args = process.argv.slice(2);
const config = { ...DEFAULT_CONFIG };

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--broker':
      config.broker = args[++i];
      break;
    case '--tenant':
      config.tenant = args[++i];
      break;
    case '--farm':
      config.farm = args[++i];
      break;
    case '--barn':
      config.barn = args[++i];
      break;
    case '--station':
      config.station = args[++i];
      break;
    case '--devices':
      config.devices = parseInt(args[++i]);
      break;
    case '--duration':
      config.duration = parseInt(args[++i]);
      break;
    case '--telemetry':
      config.telemetry = args[++i] !== 'false';
      break;
    case '--weighvision':
      config.weighvision = args[++i] !== 'false';
      break;
    case '--feed':
      config.feed = args[++i] !== 'false';
      break;
    case '--help':
      console.log(`
Enhanced IoT Simulator for FarmIQ Edge-Layer Testing

Usage:
  node iot-simulator-enhanced.js [options]

Options:
  --broker <url>      MQTT broker URL (default: mqtt://localhost:5100)
  --tenant <id>       Tenant ID (default: t-001)
  --farm <id>         Farm ID (default: f-001)
  --barn <id>         Barn ID (default: b-001)
  --devices <count>   Number of devices (default: 3)
  --duration <sec>    Test duration in seconds (default: 60)
  --telemetry <bool>  Enable telemetry simulation (default: true)
  --weighvision <bool> Enable weighvision simulation (default: true)
  --feed <bool>       Enable feed simulation (default: true)
  --help              Show this help

Example:
  node iot-simulator-enhanced.js --devices 5 --duration 120
      `);
      process.exit(0);
  }
}

// Test statistics
const stats = {
  telemetry: { sent: 0, errors: 0 },
  weighvision: { sessions: 0, frames: 0, errors: 0 },
  feed: { deliveries: 0, deltas: 0, errors: 0 },
  startTime: null,
  endTime: null
};

// Generate UUID
function generateId() {
  return randomUUID();
}

// Generate timestamp in ISO format
function generateTimestamp() {
  return new Date().toISOString();
}

// Initialize devices
const devices = [];
for (let i = 1; i <= config.devices; i++) {
  devices.push({
    id: `d-${String(i).padStart(3, '0')}`,
    type: 'sensor-gateway',
    status: 'active'
  });
}

// WeighVision device
const wvDevice = {
  id: 'wv-001',
  type: 'weighvision-camera',
  status: 'active'
};

// MQTT client
let client = null;

// Connect to MQTT broker
console.log(`\n========================================`);
console.log(`FarmIQ IoT Simulator - Enhanced`);
console.log(`========================================`);
console.log(`Broker: ${config.broker}`);
console.log(`Tenant: ${config.tenant}`);
console.log(`Farm: ${config.farm}`);
console.log(`Barn: ${config.barn}`);
console.log(`Devices: ${config.devices}`);
console.log(`Duration: ${config.duration}s`);
console.log(`Telemetry: ${config.telemetry}`);
console.log(`WeighVision: ${config.weighvision}`);
console.log(`Feed: ${config.feed}`);
console.log(`========================================\n`);

client = mqtt.connect(config.broker, {
  clientId: `iot-simulator-${generateId()}`,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 5000
});

client.on('connect', () => {
  console.log(`✅ Connected to MQTT Broker: ${config.broker}`);
  stats.startTime = new Date();

  // Start simulation
  startSimulation();
});

client.on('error', (err) => {
  console.error(`❌ MQTT connection error:`, err.message);
  process.exit(1);
});

client.on('close', () => {
  console.log(`\n🔌 MQTT connection closed`);
});

// Simulation intervals
let telemetryInterval = null;
let weighvisionInterval = null;
let feedInterval = null;
let activeSessions = new Map();

function startSimulation() {
  // Start telemetry simulation
  if (config.telemetry) {
    telemetryInterval = setInterval(simulateTelemetry, 5000); // Every 5s
    console.log(`📡 Telemetry simulation started (interval: 5s)`);
  }

  // Start weighvision simulation
  if (config.weighvision) {
    weighvisionInterval = setInterval(simulateWeighVision, 10000); // Every 10s
    console.log(`📷 WeighVision simulation started (interval: 10s)`);
  }

  // Start feed simulation
  if (config.feed) {
    feedInterval = setInterval(simulateFeed, 15000); // Every 15s
    console.log(`🌾 Feed simulation started (interval: 15s)`);
  }

  // Stop after duration
  setTimeout(stopSimulation, config.duration * 1000);
}

function stopSimulation() {
  console.log(`\n\n========================================`);
  console.log(`Stopping simulation...`);
  console.log(`========================================\n`);

  // Clear intervals
  if (telemetryInterval) clearInterval(telemetryInterval);
  if (weighvisionInterval) clearInterval(weighvisionInterval);
  if (feedInterval) clearInterval(feedInterval);

  // Close MQTT connection
  client.end();

  stats.endTime = new Date();

  // Print statistics
  printStatistics();
}

function simulateTelemetry() {
  devices.forEach(device => {
    const topic = `iot/telemetry/${config.tenant}/${config.farm}/${config.barn}/${device.id}/temperature`;
    const eventId = generateId();
    const traceId = generateId();
    const timestamp = generateTimestamp();

    const payload = {
      schema_version: "1.0",
      event_id: eventId,
      trace_id: traceId,
      tenant_id: config.tenant,
      device_id: device.id,
      event_type: "telemetry.reading",
      ts: timestamp,
      payload: {
        value: 25 + Math.random() * 5, // Random temp 25-30
        unit: "C"
      }
    };

    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to publish telemetry: ${err.message}`);
        stats.telemetry.errors++;
      } else {
        stats.telemetry.sent++;
        console.log(`📡 [TELEM] ${device.id}: ${payload.payload.value.toFixed(2)}°C (event: ${eventId})`);
      }
    });
  });
}

function simulateWeighVision() {
  // Create a new session
  const sessionId = `s-${Date.now()}`;
  const eventId = generateId();
  const traceId = generateId();
  const timestamp = generateTimestamp();

  // Session created event
  const sessionTopic = `iot/weighvision/${config.tenant}/${config.farm}/${config.barn}/${config.station}/session/${sessionId}/weighvision.session.created`;
  const sessionPayload = {
    schema_version: "1.0",
    event_id: eventId,
    trace_id: traceId,
    tenant_id: config.tenant,
    device_id: wvDevice.id,
    event_type: "weighvision.session.created",
    ts: timestamp,
    payload: {
      batch_id: `batch-test-${Math.floor(Math.random() * 1000)}`
    }
  };

  client.publish(sessionTopic, JSON.stringify(sessionPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish session: ${err.message}`);
      stats.weighvision.errors++;
    } else {
      stats.weighvision.sessions++;
      console.log(`📷 [WV-SESSION] Created: ${sessionId} (event: ${eventId})`);

      // Simulate frame upload after 1 second
      setTimeout(() => simulateFrame(sessionId, traceId), 1000);
    }
  });
}

function simulateFrame(sessionId, traceId) {
  const eventId = generateId();
  const timestamp = generateTimestamp();

  const frameTopic = `iot/weighvision/${config.tenant}/${config.farm}/${config.barn}/${config.station}/session/${sessionId}/weighvision.frame.uploaded`;
  const framePayload = {
    schema_version: "1.0",
    event_id: eventId,
    trace_id: traceId,
    tenant_id: config.tenant,
    device_id: wvDevice.id,
    event_type: "weighvision.frame.uploaded",
    ts: timestamp,
    payload: {
      session_id: sessionId,
      frame_number: Math.floor(Math.random() * 100),
      media_id: `media-${generateId()}`,
      content_type: "image/jpeg"
    }
  };

  client.publish(frameTopic, JSON.stringify(framePayload), { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish frame: ${err.message}`);
      stats.weighvision.errors++;
    } else {
      stats.weighvision.frames++;
      console.log(`📷 [WV-FRAME] Uploaded for session: ${sessionId}`);
    }
  });
}

function simulateFeed() {
  // Simulate feed delivery
  const deliveryEventId = generateId();
  const traceId = generateId();
  const timestamp = generateTimestamp();

  const deliveryTopic = `iot/feed/${config.tenant}/${config.farm}/${config.barn}/delivery`;
  const deliveryPayload = {
    schema_version: "1.0",
    event_id: deliveryEventId,
    trace_id: traceId,
    tenant_id: config.tenant,
    event_type: "feed.delivery",
    ts: timestamp,
    payload: {
      delivery_id: `delivery-${generateId()}`,
      feed_type: "starter",
      quantity_kg: Math.floor(500 + Math.random() * 1000),
      source: "external"
    }
  };

  client.publish(deliveryTopic, JSON.stringify(deliveryPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish feed delivery: ${err.message}`);
      stats.feed.errors++;
    } else {
      stats.feed.deliveries++;
      console.log(`🌾 [FEED-DELIVERY] ${deliveryPayload.payload.quantity_kg}kg (event: ${deliveryEventId})`);
    }
  });

  // Simulate silo delta
  const deltaEventId = generateId();
  const deltaTopic = `iot/feed/${config.tenant}/${config.farm}/${config.barn}/silo/delta`;
  const deltaPayload = {
    schema_version: "1.0",
    event_id: deltaEventId,
    trace_id: traceId,
    tenant_id: config.tenant,
    event_type: "feed.silo.delta",
    ts: timestamp,
    payload: {
      silo_id: `silo-${Math.floor(Math.random() * 5) + 1}`,
      delta_kg: Math.floor(-50 - Math.random() * 50), // Negative = consumption
      current_level_kg: Math.floor(1000 + Math.random() * 5000)
    }
  };

  client.publish(deltaTopic, JSON.stringify(deltaPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish silo delta: ${err.message}`);
      stats.feed.errors++;
    } else {
      stats.feed.deltas++;
      console.log(`🌾 [FEED-DELTA] Silo ${deltaPayload.payload.silo_id}: ${deltaPayload.payload.delta_kg}kg`);
    }
  });
}

function printStatistics() {
  const duration = stats.endTime - stats.startTime;
  const durationSec = (duration / 1000).toFixed(2);

  console.log(`\n========================================`);
  console.log(`Test Statistics`);
  console.log(`========================================`);
  console.log(`Duration: ${durationSec}s`);
  console.log(`\n📡 Telemetry:`);
  console.log(`   Sent: ${stats.telemetry.sent}`);
  console.log(`   Errors: ${stats.telemetry.errors}`);
  console.log(`\n📷 WeighVision:`);
  console.log(`   Sessions: ${stats.weighvision.sessions}`);
  console.log(`   Frames: ${stats.weighvision.frames}`);
  console.log(`   Errors: ${stats.weighvision.errors}`);
  console.log(`\n🌾 Feed:`);
  console.log(`   Deliveries: ${stats.feed.deliveries}`);
  console.log(`   Deltas: ${stats.feed.deltas}`);
  console.log(`   Errors: ${stats.feed.errors}`);
  console.log(`\n========================================`);
  console.log(`Total Messages: ${stats.telemetry.sent + stats.weighvision.sessions + stats.weighvision.frames + stats.feed.deliveries + stats.feed.deltas}`);
  console.log(`Total Errors: ${stats.telemetry.errors + stats.weighvision.errors + stats.feed.errors}`);
  console.log(`Success Rate: ${((1 - (stats.telemetry.errors + stats.weighvision.errors + stats.feed.errors) / (stats.telemetry.sent + stats.weighvision.sessions + stats.weighvision.frames + stats.feed.deliveries + stats.feed.deltas || 1)) * 100).toFixed(2)}%`);
  console.log(`========================================\n`);

  // Exit with appropriate code
  const totalErrors = stats.telemetry.errors + stats.weighvision.errors + stats.feed.errors;
  process.exit(totalErrors > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\nReceived SIGINT, stopping simulation...`);
  stopSimulation();
});

process.on('SIGTERM', () => {
  console.log(`\n\nReceived SIGTERM, stopping simulation...`);
  stopSimulation();
});
