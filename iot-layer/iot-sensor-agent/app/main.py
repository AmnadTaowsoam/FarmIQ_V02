"""
Main entry point for IoT Sensor Agent.
Orchestrates sensor polling, telemetry envelope creation, and MQTT publishing.
"""

import logging
import signal
import sys
import threading
import time
from typing import Optional

from app.config import Config
from app.mqtt_client import MQTTClient
from app.sensors import SensorManager
from app.telemetry import create_telemetry_envelope

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class SensorAgent:
    """Main agent class that orchestrates sensor data collection and MQTT publishing."""

    def __init__(self, config: Config):
        """
        Initialize sensor agent.

        Args:
            config: Application configuration
        """
        self.config = config
        self.mqtt_client = MQTTClient(config)
        self.sensor_manager = SensorManager()
        self._running = False
        self._poll_thread: Optional[threading.Thread] = None

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}. Shutting down gracefully...")
        self.stop()

    def _poll_sensors(self) -> None:
        """Poll sensors and publish telemetry data."""
        logger.info(f"Starting sensor polling with interval {self.config.POLL_INTERVAL_MS}ms")

        while self._running:
            try:
                # Read all sensors
                readings = self.sensor_manager.read_all()

                # Create and publish telemetry envelopes
                for reading in readings:
                    envelope = create_telemetry_envelope(
                        tenant_id=self.config.TENANT_ID,
                        farm_id=self.config.FARM_ID,
                        barn_id=self.config.BARN_ID,
                        device_id=self.config.DEVICE_ID,
                        metric=reading.metric,
                        value=reading.value,
                        unit=reading.unit,
                        schema_version=self.config.SCHEMA_VERSION,
                    )

                    # Publish to MQTT
                    self.mqtt_client.publish_telemetry(envelope)

                logger.debug(f"Published {len(readings)} telemetry readings")

            except Exception as e:
                logger.error(f"Error during sensor polling: {e}")

            # Wait for next poll interval
            time.sleep(self.config.POLL_INTERVAL_MS / 1000.0)

    def start(self) -> None:
        """Start the sensor agent."""
        logger.info("Starting IoT Sensor Agent...")

        # Validate configuration
        try:
            self.config.validate()
        except ValueError as e:
            logger.error(f"Configuration validation failed: {e}")
            sys.exit(1)

        # Connect to MQTT broker
        if not self.mqtt_client.connect(retry=True, max_retries=10, retry_delay=5.0):
            logger.error("Failed to connect to MQTT broker. Exiting.")
            sys.exit(1)

        # Start sensor polling
        self._running = True
        self._poll_thread = threading.Thread(target=self._poll_sensors, daemon=True)
        self._poll_thread.start()

        logger.info("IoT Sensor Agent started successfully")

    def stop(self) -> None:
        """Stop the sensor agent."""
        if not self._running:
            return

        logger.info("Stopping IoT Sensor Agent...")
        self._running = False

        # Wait for poll thread to finish
        if self._poll_thread:
            self._poll_thread.join(timeout=5.0)

        # Disconnect from MQTT
        self.mqtt_client.disconnect()

        logger.info("IoT Sensor Agent stopped")

    def run(self) -> None:
        """Run the agent until interrupted."""
        self.start()

        try:
            # Keep main thread alive
            while self._running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        finally:
            self.stop()


def main() -> None:
    """Main entry point."""
    # Load configuration
    config = Config()

    # Create and run agent
    agent = SensorAgent(config)
    agent.run()


if __name__ == "__main__":
    main()
