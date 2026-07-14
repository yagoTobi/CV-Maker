"""One-time migration: copy JSON file data into DynamoDB.

Usage:
    DYNAMODB_ENDPOINT_URL=http://localhost:8100 python scripts/migrate_to_dynamodb.py
    # or from Docker:
    docker exec cv-maker-backend python scripts/migrate_to_dynamodb.py
"""

import json
import os
import sys

# Add backend to path so we can import services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import asyncio

from services.storage import DynamoStorage


USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "user_data")


async def migrate(user_id: str = "local"):
    storage = DynamoStorage()
    migrated = 0

    # --- CV Versions ---
    versions_dir = os.path.join(USER_DATA_DIR, "versions")
    if os.path.isdir(versions_dir):
        for fname in os.listdir(versions_dir):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(versions_dir, fname), "r") as f:
                    data = json.load(f)
                await storage.create_version(user_id, data)
                migrated += 1
                print(f"  Migrated version: {data.get('name', fname)}")
            except Exception as e:
                print(f"  SKIP {fname}: {e}", file=sys.stderr)

    # --- User Profile ---
    profile_path = os.path.join(USER_DATA_DIR, "profile.json")
    if os.path.isfile(profile_path):
        try:
            with open(profile_path, "r") as f:
                profile = json.load(f)
            await storage.save_profile(user_id, profile)
            migrated += 1
            print("  Migrated user profile")
        except Exception as e:
            print(f"  SKIP profile: {e}", file=sys.stderr)

    print(f"\nMigration complete: {migrated} items migrated for user '{user_id}'.")


if __name__ == "__main__":
    user = sys.argv[1] if len(sys.argv) > 1 else "local"
    asyncio.run(migrate(user))
