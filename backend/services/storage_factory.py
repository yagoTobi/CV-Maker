import os
from functools import lru_cache

from services.storage import StorageBackend


@lru_cache(maxsize=1)
def _create_storage() -> StorageBackend:
    backend = os.getenv("STORAGE_BACKEND", "file").lower()
    if backend == "dynamodb":
        from services.dynamo_storage import DynamoStorage
        return DynamoStorage()
    base_dir = os.path.join(os.path.dirname(__file__), "..", "user_data")
    from services.file_storage import FileStorage
    return FileStorage(base_dir=base_dir)


def get_storage() -> StorageBackend:
    """FastAPI dependency — returns the singleton storage backend."""
    return _create_storage()
