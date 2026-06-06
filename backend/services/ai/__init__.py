"""AI subpackage: Bedrock client + LLM response cache.

Re-exports public surface so callers can use:

    from services.ai import bedrock_client, MODEL_HAIKU, MODEL_SONNET, MODEL_TAILOR, llm_cache

instead of importing each submodule individually. The `llm_cache` module
itself is re-exported (not just its symbols) so callers that do
``llm_cache.cache_key(...)`` continue to work.
"""

from . import llm_cache
from .bedrock import (
    MODEL_HAIKU,
    MODEL_SONNET,
    MODEL_TAILOR,
    BedrockClient,
    bedrock_client,
)

__all__ = [
    "BedrockClient",
    "MODEL_HAIKU",
    "MODEL_SONNET",
    "MODEL_TAILOR",
    "bedrock_client",
    "llm_cache",
]
