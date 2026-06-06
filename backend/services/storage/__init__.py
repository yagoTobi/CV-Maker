"""Storage subpackage: backend persistence + version helpers.

Re-exports public surface so callers can use:

    from services.storage import StorageBackend, get_storage, version_service

instead of importing each submodule individually.
"""

from . import version_service
from .dynamo_storage import DynamoStorage
from .file_storage import FileStorage
from .storage import StorageBackend
from .storage_factory import get_storage

__all__ = [
    "DynamoStorage",
    "FileStorage",
    "StorageBackend",
    "get_storage",
    "version_service",
]
