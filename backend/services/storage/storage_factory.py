import os
from functools import lru_cache

from .storage import StorageBackend


@lru_cache(maxsize=1)
def _create_storage() -> StorageBackend:
    backend = os.getenv("STORAGE_BACKEND", "file").lower()
    if backend == "dynamodb":
        from .dynamo_storage import DynamoStorage
        return DynamoStorage()
    # __file__ is backend/services/storage/storage_factory.py — three levels up to backend/
    base_dir = os.path.join(os.path.dirname(__file__), "..", "..", "user_data")
    from .file_storage import FileStorage
    return FileStorage(base_dir=base_dir)


def get_storage() -> StorageBackend:
    """FastAPI dependency — returns the singleton storage backend."""
    return _create_storage()
