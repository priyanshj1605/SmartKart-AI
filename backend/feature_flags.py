from fastapi import HTTPException


def require_enabled(enabled: bool, feature_name: str):
    if not enabled:
        raise HTTPException(status_code=403, detail=f'{feature_name} are disabled in Settings.')
