import sqlite3
from datetime import datetime, timezone
from typing import Optional

from .utils import ensure_dir


class StateStore:
    def __init__(self, state_dir: str):
        ensure_dir(state_dir)
        self.db_path = f"{state_dir}/state.db"
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS processed (
                    path TEXT PRIMARY KEY,
                    processed_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def is_processed(self, path: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("SELECT 1 FROM processed WHERE path = ?", (path,))
            return cur.fetchone() is not None

    def mark_processed(self, path: str) -> None:
        processed_at = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO processed (path, processed_at) VALUES (?, ?)",
                (path, processed_at),
            )
            conn.commit()
