import time
import json
import logging
import random
import threading
import paho.mqtt.client as mqtt

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OTAAgent")

# Configuration
BROKER = "edge-mqtt-broker"
PORT = 1883 # Use 8883 for prod with TLS
DEVICE_ID = "test-device-01"
OTA_TOPIC = f"farmiq/device/{DEVICE_ID}/ota"
STATUS_TOPIC = f"farmiq/device/{DEVICE_ID}/ota/status"

# Simulated State
current_version = "1.0.0"
current_partition = "A"
state = "IDLE" # IDLE, DOWNLOADING, INSTALLING, VERIFYING, ROLLED_BACK

def on_connect(client, userdata, flags, rc):
    logger.info(f"Connected to MQTT Broker with code {rc}")
    client.subscribe(OTA_TOPIC)
    logger.info(f"Subscribed to {OTA_TOPIC}")
    # Report initial state
    report_status(client, "IDLE", "Ready for updates")

def report_status(client, status, message=""):
    payload = {
        "deviceId": DEVICE_ID,
        "currentVersion": current_version,
        "partition": current_partition,
        "status": status,
        "message": message,
        "timestamp": time.time()
    }
    client.publish(STATUS_TOPIC, json.dumps(payload), retain=True)
    logger.info(f"Reported status: {status} - {message}")

def simulate_ota_process(client, version, checksum):
    global current_version, current_partition, state
    
    # 1. Downloading
    state = "DOWNLOADING"
    report_status(client, state, f"Downloading firmware {version}...")
    time.sleep(3) # Simulate download time
    
    # 2. Verification (Simulated Checksum)
    if random.random() < 0.1: # 10% chance of corruption
        state = "FAILED"
        report_status(client, state, "Checksum verification failed")
        return

    # 3. Installing (Switch Partition)
    state = "INSTALLING"
    target_partition = "B" if current_partition == "A" else "A"
    report_status(client, state, f"Writing to partition {target_partition}...")
    time.sleep(3)
    
    # Switch active partition simulates reboot
    logger.info("Simulating Device Reboot...")
    time.sleep(2)
    
    # 4. Verifying (Health Check)
    if random.random() < 0.2: # 20% chance of boot failure
        logger.error("Boot verification failed! Rolling back...")
        state = "ROLLED_BACK"
        # Partition stays same (rollback)
        report_status(client, state, f"Rolled back to {current_version}")
    else:
        # Success
        current_version = version
        current_partition = target_partition
        state = "IDLE"
        report_status(client, "SUCCESS", f"Updated to {current_version} on partition {current_partition}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        logger.info(f"Received OTA command: {data}")
        
        command = data.get("command")
        if command == "UPDATE":
            version = data.get("version")
            checksum = data.get("checksum")
            
            if not version:
                logger.error("Missing version in OTA command")
                return

            # Start OTA process in separate thread
            threading.Thread(target=simulate_ota_process, args=(client, version, checksum)).start()
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")

def main():
    client = mqtt.Client(client_id=f"ota-agent-{DEVICE_ID}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    logger.info(f"Connecting to {BROKER}...")
    try:
        client.connect(BROKER, PORT, 60)
        client.loop_forever()
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        time.sleep(5)

if __name__ == "__main__":
    main()
