"""AI subpackage: Bedrock client + LLM response cache + assist provider seam.

Re-exports public surface so callers can use:

    from services.ai import bedrock_client, MODEL_HAIKU, MODEL_SONNET, MODEL_TAILOR, llm_cache, assist_complete

instead of importing each submodule individually. The `llm_cache` module
itself is re-exported (not just its symbols) so callers that do
``llm_cache.cache_key(...)`` continue to work.
"""

from . import llm_cache
from .assist import assist_complete
from .bedrock import (
    MODEL_HAIKU,
    MODEL_SONNET,
    MODEL_TAILOR,
    BedrockClient,
    bedrock_client,
)

__all__ = [
    "assist_complete",
    "BedrockClient",
    "MODEL_HAIKU",
    "MODEL_SONNET",
    "MODEL_TAILOR",
    "bedrock_client",
    "llm_cache",
]
