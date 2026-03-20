"""Create the cv-maker DynamoDB table (works with both DynamoDB Local and AWS)."""

import os
import sys

import boto3
from botocore.exceptions import ClientError


def create_table():
    table_name = os.getenv("DYNAMODB_TABLE_NAME", "cv-maker")
    endpoint_url = os.getenv("DYNAMODB_ENDPOINT_URL")
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    kwargs = {}
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url

    client = boto3.client("dynamodb", region_name=region, **kwargs)

    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        print(f"Table '{table_name}' created successfully.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"Table '{table_name}' already exists.")
        else:
            print(f"Error creating table: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    create_table()
