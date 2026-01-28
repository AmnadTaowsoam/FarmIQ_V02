"""
Main entry point for IoT WeighVision Agent.

Provides CLI interface for running the agent and managing sessions.
"""

import argparse
import logging
import signal
import sys
import time
from typing import Optional

from . import __version__
from .config import get_config, reset_config
from .events import DeviceHealth, create_device_status_event
from .mqtt_client import MQTTClient
from .session import SessionManager, WeighSession

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


class WeighVisionAgent:
    """Main agent class for IoT WeighVision."""
    
    def __init__(self):
        self.config = get_config()
        self.session_manager = SessionManager()
        self.mqtt_client: Optional[MQTTClient] = None
        self.running = False
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    def start(self) -> None:
        """Start the agent."""
        logger.info(f"Starting IoT WeighVision Agent v{__version__}")
        logger.info(f"Device ID: {self.config.device.device_id}")
        logger.info(f"Tenant: {self.config.device.tenant_id}")
        logger.info(f"Farm: {self.config.device.farm_id}")
        logger.info(f"Barn: {self.config.device.barn_id}")
        logger.info(f"Station: {self.config.device.station_id}")
        
        # Connect to MQTT
        self.mqtt_client = MQTTClient()
        self.mqtt_client.connect()
        
        # Publish initial status
        self.mqtt_client.publish_status(online=True)
        
        self.running = True
        logger.info("Agent started successfully")
    
    def stop(self) -> None:
        """Stop the agent."""
        logger.info("Stopping agent...")
        
        # Finalize all active sessions
        self.session_manager.cleanup_all()
        
        # Publish offline status
        if self.mqtt_client:
            self.mqtt_client.publish_status(online=False)
            self.mqtt_client.disconnect()
        
        self.running = False
        logger.info("Agent stopped")
    
    def run_session(
        self,
        batch_id: Optional[str] = None,
        trace_id: Optional[str] = None,
    ) -> bool:
        """
        Run a single weigh session.
        
        Args:
            batch_id: Optional batch ID
            trace_id: Optional trace ID
        
        Returns:
            True if session completed successfully, False otherwise
        """
        logger.info("Starting weigh session...")
        
        # Create and run session
        session = self.session_manager.create_session(batch_id, trace_id)
        if not session:
            logger.error("Failed to create session")
            return False
        
        try:
            # Capture and record (Phase 1: single capture)
            success = session.capture_and_record()
            
            if success:
                # Finalize session
                success = session.finalize()
                
                if success:
                    logger.info(
                        f"Session completed: {session.session_id}, "
                        f"images: {len(session.images)}, "
                        f"weight: {session.final_weight} kg"
                    )
                else:
                    logger.error("Failed to finalize session")
            else:
                logger.error("Failed to capture and record")
            
            return success
            
        finally:
            # Cleanup is handled by session manager
            self.session_manager.finalize_session(session.session_id)
    
    def run_continuous(self, interval_seconds: int = 60) -> None:
        """
        Run the agent in continuous mode.
        
        Args:
            interval_seconds: Interval between sessions
        """
        logger.info(f"Running in continuous mode (interval: {interval_seconds}s)")
        
        while self.running:
            try:
                # Run a session
                self.run_session()
                
                # Wait for next interval
                for _ in range(interval_seconds):
                    if not self.running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error in continuous mode: {e}")
                time.sleep(5)  # Wait before retrying
    
    def get_status(self) -> dict:
        """Get agent status."""
        return {
            "version": __version__,
            "running": self.running,
            "device_id": self.config.device.device_id,
            "tenant_id": self.config.device.tenant_id,
            "farm_id": self.config.device.farm_id,
            "barn_id": self.config.device.barn_id,
            "station_id": self.config.device.station_id,
            "active_sessions": len(self.session_manager.active_sessions),
            "mqtt_connected": self.mqtt_client.connected if self.mqtt_client else False,
            "buffer_size": self.mqtt_client.get_buffer_size() if self.mqtt_client else 0,
            "mock_hardware": self.config.device.mock_hardware,
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="IoT WeighVision Agent for FarmIQ",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run a single session
  python -m app.main --mode single --batch-id batch-001
  
  # Run in continuous mode with 60 second intervals
  python -m app.main --mode continuous --interval 60
  
  # Run with mock hardware for testing
  python -m app.main --mode single --mock-hardware
        """,
    )
    
    parser.add_argument(
        "--mode",
        choices=["single", "continuous", "status"],
        default="single",
        help="Agent mode: single (run one session), continuous (run sessions continuously), status (show status)",
    )
    
    parser.add_argument(
        "--batch-id",
        help="Batch ID for the session",
    )
    
    parser.add_argument(
        "--trace-id",
        help="Trace ID for the session",
    )
    
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Interval between sessions in continuous mode (default: 60)",
    )
    
    parser.add_argument(
        "--mock-hardware",
        action="store_true",
        help="Use mock hardware for testing",
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"IoT WeighVision Agent v{__version__}",
    )
    
    args = parser.parse_args()
    
    # Override config with command line args
    if args.mock_hardware:
        import os
        os.environ["MOCK_HARDWARE"] = "true"
        reset_config()
    
    # Create agent
    agent = WeighVisionAgent()
    
    # Handle status mode
    if args.mode == "status":
        agent.start()
        status = agent.get_status()
        print("\n=== Agent Status ===")
        for key, value in status.items():
            print(f"{key}: {value}")
        print("==================\n")
        agent.stop()
        return 0
    
    # Start agent
    agent.start()
    
    try:
        if args.mode == "single":
            # Run single session
            success = agent.run_session(
                batch_id=args.batch_id,
                trace_id=args.trace_id,
            )
            return 0 if success else 1
            
        elif args.mode == "continuous":
            # Run continuous mode
            agent.run_continuous(interval_seconds=args.interval)
            return 0
            
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        return 1
    finally:
        agent.stop()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
