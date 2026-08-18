import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from starlette import status


class SlidingWindowRateLimiter:
    """
    Counts recent hits per key in memory. Good enough to stop a script from filling a
    tournament with junk teams; it is not shared between processes, so with more than one
    worker each of them allows `max_hits` on its own.
    """

    def __init__(self, max_hits: int, window_seconds: float) -> None:
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]

        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()

        if len(hits) >= self.max_hits:
            return False

        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


def get_client_key(request: Request) -> str:
    return request.client.host if request.client is not None else "unknown"


registration_rate_limiter = SlidingWindowRateLimiter(max_hits=10, window_seconds=60 * 60)


def check_registration_rate_limit(request: Request) -> None:
    if not registration_rate_limiter.check(get_client_key(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registrations from this address, please try again later",
        )
