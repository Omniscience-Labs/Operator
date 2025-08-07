import os
import sys


def _ensure_backend_on_path() -> None:
    """Ensure the backend project root is on sys.path for test imports.

    This allows test modules to import top-level packages such as
    `agent`, `agentpress`, etc., without requiring an editable install.
    """
    current_dir = os.path.dirname(__file__)
    backend_root = os.path.abspath(os.path.join(current_dir, os.pardir))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)


_ensure_backend_on_path()

