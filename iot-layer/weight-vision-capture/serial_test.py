from __future__ import annotations

import argparse
import sys
import time


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simple serial test for USB scale.")
    parser.add_argument("--port", default="COM6", help="Serial port (e.g. COM6)")
    parser.add_argument("--baud", type=int, default=9600)
    parser.add_argument("--bytesize", type=int, choices=[7, 8], default=8)
    parser.add_argument("--parity", choices=["N", "E", "O", "M", "S"], default="N")
    parser.add_argument("--stopbits", type=int, choices=[1, 2], default=1)
    parser.add_argument("--timeout", type=float, default=0.2)
    parser.add_argument("--duration", type=float, default=15.0, help="Seconds to listen (0 = forever)")
    parser.add_argument("--write", default=None, help="Send a text command after opening")
    parser.add_argument("--write-hex", default=None, help="Send hex bytes, e.g. '02 30 31 03'")
    return parser.parse_args()


def _hex_to_bytes(hex_str: str) -> bytes:
    parts = [p for p in hex_str.replace(",", " ").split() if p]
    return bytes(int(p, 16) for p in parts)


def main() -> int:
    args = _parse_args()
    try:
        import serial
    except Exception:
        print("pyserial is required. Install with: pip install pyserial")
        return 2

    parity_map = {
        "N": serial.PARITY_NONE,
        "E": serial.PARITY_EVEN,
        "O": serial.PARITY_ODD,
        "M": serial.PARITY_MARK,
        "S": serial.PARITY_SPACE,
    }
    stop_map = {1: serial.STOPBITS_ONE, 2: serial.STOPBITS_TWO}
    bytesize_map = {7: serial.SEVENBITS, 8: serial.EIGHTBITS}

    try:
        ser = serial.Serial(
            port=args.port,
            baudrate=args.baud,
            bytesize=bytesize_map[args.bytesize],
            parity=parity_map[args.parity],
            stopbits=stop_map[args.stopbits],
            timeout=args.timeout,
        )
    except Exception as exc:
        print(f"Failed to open {args.port}: {exc}")
        return 1

    print(f"Opened {args.port} @ {args.baud} {args.bytesize}{args.parity}{args.stopbits}")
    ser.reset_input_buffer()

    if args.write_hex:
        payload = _hex_to_bytes(args.write_hex)
        ser.write(payload)
        print(f"Sent hex: {payload.hex(' ')}")
    elif args.write:
        payload = args.write.encode("utf-8")
        ser.write(payload)
        print(f"Sent text: {args.write!r}")

    t_end = None if args.duration == 0 else (time.time() + args.duration)
    print("Listening for data...")

    try:
        while True:
            if t_end is not None and time.time() > t_end:
                break
            waiting = ser.in_waiting
            if waiting:
                data = ser.read(waiting)
                text = data.decode("utf-8", errors="replace")
                ts = time.strftime("%H:%M:%S")
                print(f"[{ts}] text={text!r} hex={data.hex(' ')}")
            else:
                time.sleep(0.05)
    except KeyboardInterrupt:
        print("Stopped by user.")
    finally:
        ser.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
