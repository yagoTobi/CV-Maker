import json
import os
from typing import Any, Dict, Generator, List

import boto3


class BedrockClient:
    def __init__(self):
        region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self.client = boto3.client("bedrock-runtime", region_name=region)
        # Use cross-region inference profile for Claude 3.5 Sonnet v2
        self.model_id = "us.anthropic.claude-3-5-haiku-20241022-v1:0"

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        stream: bool = True,
        max_tokens: int = 4096,
        model_id: str | None = None,
    ) -> Generator[str, None, None] | str:
        """
        Send a chat request to Bedrock Claude.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: System prompt for the AI
            stream: Whether to stream the response

        Yields/Returns:
            If stream=True: Generator yielding text chunks
            If stream=False: Complete response string
        """
        # Convert messages to Bedrock format
        bedrock_messages = []
        for msg in messages:
            bedrock_messages.append(
                {
                    "role": msg["role"],
                    "content": [{"type": "text", "text": msg["content"]}],
                }
            )

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": bedrock_messages,
        }

        effective_model = model_id or self.model_id

        if stream:
            response = self.client.invoke_model_with_response_stream(
                modelId=effective_model, body=json.dumps(request_body)
            )
            return self._stream_response(response)
        else:
            response = self.client.invoke_model(
                modelId=effective_model, body=json.dumps(request_body)
            )
            response_body = json.loads(response["body"].read())
            return response_body["content"][0]["text"]

    def _stream_response(self, response) -> Generator[str, None, None]:
        """Process streaming response from Bedrock."""
        for event in response["body"]:
            chunk = json.loads(event["chunk"]["bytes"])
            if chunk["type"] == "content_block_delta":
                delta = chunk.get("delta", {})
                if delta.get("type") == "text_delta":
                    yield delta.get("text", "")

    def chat_with_document(
        self,
        document_bytes: bytes,
        document_media_type: str,
        text_prompt: str,
        system_prompt: str,
        max_tokens: int = 4096,
        model_id: str | None = None,
    ) -> str:
        """
        Send a message with a document attachment to Claude.
        Uses invoke_model (non-streaming) since we need the complete response.
        """
        import base64

        document_base64 = base64.b64encode(document_bytes).decode("utf-8")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": document_media_type,
                            "data": document_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": text_prompt,
                    },
                ],
            }
        ]

        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        }

        effective_model = model_id or self.model_id

        response = self.client.invoke_model(
            modelId=effective_model,
            body=json.dumps(request_body),
        )
        response_body = json.loads(response["body"].read())
        return response_body["content"][0]["text"]


bedrock_client = BedrockClient()
