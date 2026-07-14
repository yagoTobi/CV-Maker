import os
from decimal import Decimal
from typing import Optional

import boto3

from utils.id_helpers import ensure_ids


class DynamoStorage:
    """DynamoDB storage backend using single-table design."""

    def __init__(self):
        table_name = os.getenv("DYNAMODB_TABLE_NAME", "cv-maker")
        endpoint_url = os.getenv("DYNAMODB_ENDPOINT_URL")
        kwargs = {}
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
        region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self._table = boto3.resource("dynamodb", region_name=region, **kwargs).Table(table_name)

    @staticmethod
    def _pk(user_id: str) -> str:
        return f"USER#{user_id}"

    @staticmethod
    def _version_sk(version_id: str) -> str:
        return f"VERSION#{version_id}"

    @staticmethod
    def _strip_keys(item: dict) -> dict:
        """Remove DynamoDB key attributes before returning to caller."""
        item.pop("PK", None)
        item.pop("SK", None)
        item.pop("entityType", None)
        return item

    @staticmethod
    def _convert_decimals(obj):
        """Recursively convert Decimal values to int/float for JSON compat."""
        if isinstance(obj, list):
            return [DynamoStorage._convert_decimals(v) for v in obj]
        if isinstance(obj, dict):
            return {k: DynamoStorage._convert_decimals(v) for k, v in obj.items()}
        if isinstance(obj, Decimal):
            return int(obj) if obj == int(obj) else float(obj)
        return obj

    @staticmethod
    def _sanitize_for_dynamo(obj):
        """Convert float values to Decimal and remove empty strings (DynamoDB rejects them)."""
        if isinstance(obj, list):
            return [DynamoStorage._sanitize_for_dynamo(v) for v in obj]
        if isinstance(obj, dict):
            return {
                k: DynamoStorage._sanitize_for_dynamo(v)
                for k, v in obj.items()
                if v != ""  # DynamoDB does not allow empty string attribute values
            }
        if isinstance(obj, float):
            return Decimal(str(obj))
        return obj

    # --- CV Versions ---

    async def list_versions(self, user_id: str) -> list[dict]:
        resp = self._table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={
                ":pk": self._pk(user_id),
                ":prefix": "VERSION#",
            },
        )
        return [self._convert_decimals(self._strip_keys(item)) for item in resp.get("Items", [])]

    async def get_version(self, user_id: str, version_id: str) -> Optional[dict]:
        resp = self._table.get_item(
            Key={"PK": self._pk(user_id), "SK": self._version_sk(version_id)}
        )
        item = resp.get("Item")
        if item is None:
            return None
        item = self._convert_decimals(self._strip_keys(item))

        # Auto-migrate: ensure all entries have stable IDs (D-05, D-06)
        form_data = item.get("formData")
        if form_data:
            form_data, was_modified = ensure_ids(form_data)
            if was_modified:
                item["formData"] = form_data
                await self.update_version(user_id, version_id, {"formData": form_data})

        return item

    async def create_version(self, user_id: str, version_data: dict) -> dict:
        item = self._sanitize_for_dynamo(version_data)
        item["PK"] = self._pk(user_id)
        item["SK"] = self._version_sk(version_data["id"])
        item["entityType"] = "CV_VERSION"
        self._table.put_item(Item=item)
        return version_data

    async def update_version(self, user_id: str, version_id: str, updates: dict) -> Optional[dict]:
        existing = await self.get_version(user_id, version_id)
        if existing is None:
            return None
        existing.update(updates)
        item = self._sanitize_for_dynamo(existing)
        item["PK"] = self._pk(user_id)
        item["SK"] = self._version_sk(version_id)
        item["entityType"] = "CV_VERSION"
        self._table.put_item(Item=item)
        return existing

    async def delete_version(self, user_id: str, version_id: str) -> bool:
        self._table.delete_item(
            Key={"PK": self._pk(user_id), "SK": self._version_sk(version_id)}
        )
        return True

    async def update_children_of_deleted_parent(self, user_id: str, parent_id: str) -> None:
        all_versions = await self.list_versions(user_id)
        for v in all_versions:
            if v.get("parentVersionId") == parent_id:
                await self.update_version(user_id, v["id"], {"parentVersionId": None})

    # --- User Profile ---

    async def get_profile(self, user_id: str) -> Optional[dict]:
        resp = self._table.get_item(
            Key={"PK": self._pk(user_id), "SK": "PROFILE"}
        )
        item = resp.get("Item")
        if item is None:
            return None
        return self._convert_decimals(self._strip_keys(item))

    async def save_profile(self, user_id: str, profile: dict) -> None:
        item = self._sanitize_for_dynamo(profile)
        item["PK"] = self._pk(user_id)
        item["SK"] = "PROFILE"
        item["entityType"] = "USER_PROFILE"
        self._table.put_item(Item=item)

    async def delete_profile(self, user_id: str) -> bool:
        self._table.delete_item(
            Key={"PK": self._pk(user_id), "SK": "PROFILE"}
        )
        return True
