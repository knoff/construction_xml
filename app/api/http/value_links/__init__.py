from .router import router, locks_router
from .legacy import legacy_router, legacy_locks_router

__all__ = [
    "router",
    "locks_router",
    "legacy_router",
    "legacy_locks_router",
]
