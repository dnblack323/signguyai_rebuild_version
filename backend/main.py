try:
    from .server import app
except ImportError:
    from server import app

__all__ = ["app"]
