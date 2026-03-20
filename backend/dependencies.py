from fastapi import Header


async def get_current_user(x_user_id: str = Header(default="local")) -> str:
    """Extract user ID from X-User-Id header. Defaults to 'local' for single-user mode.

    Swap this for JWT/Cognito validation when adding auth.
    """
    return x_user_id
