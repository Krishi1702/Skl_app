from __future__ import annotations

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.auth import AccessTokenOut, LoginIn, RefreshIn, RegisterIn, RegisterOut, TokenOut
from app.services.auth_service import AuthService, revoke_token

router = APIRouter()


@router.post("/register", response_model=RegisterOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: DbSession):
    svc = AuthService(db)
    return await svc.register(body)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: DbSession):
    svc = AuthService(db)
    return await svc.login(body)


@router.post("/refresh", response_model=AccessTokenOut)
async def refresh(body: RefreshIn, db: DbSession):
    svc = AuthService(db)
    return await svc.refresh(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshIn):
    await revoke_token(body.refresh_token)
    return None


@router.get("/me")
async def me(current_user: CurrentUser):
    return current_user
