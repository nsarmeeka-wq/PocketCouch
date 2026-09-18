"""In-memory login throttle.

Enough to stop a script from grinding through passwords during a demo, and honest
about what it is: process-local, resets on restart. A real deployment swaps this
for Redis or a column on `users`.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from app.config import settings


class LoginThrottle:
    def __init__(self, max_attempts: int | None = None, window_seconds: int | None = None) -> None:
        self.max_attempts = max_attempts or settings.max_login_attempts
        self.window_seconds = window_seconds or settings.login_window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _prune(self, key: str, now: float) -> deque[float]:
        bucket = self._failures[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        return bucket

    def retry_after(self, key: str) -> int:
        """Seconds until this key may try again (0 when it is allowed now)."""
        now = time.monotonic()
        bucket = self._prune(key, now)
        if len(bucket) < self.max_attempts:
            return 0
        return max(1, int(self.window_seconds - (now - bucket[0])))

    def record_failure(self, key: str) -> None:
        self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)


login_throttle = LoginThrottle()
