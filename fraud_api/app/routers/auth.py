
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import jwt

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY  = "fraudshield-secret-2024"   # đổi khi deploy production
ALGORITHM   = "HS256"
TOKEN_TTL   = 60 * 8  # minutes

USERS = {
    "admin":    {"password": "admin123",    "role": "admin"},
    "customer": {"password": "customer123", "role": "customer"},
}

# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["Auth"])


def create_token(data: dict, expires_minutes: int = TOKEN_TTL) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


@router.post("/login", response_model=LoginResponse, summary="Đăng nhập")
def login(body: LoginRequest):
    user = USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu.",
        )

    token = create_token({"sub": body.username, "role": user["role"]})
    return LoginResponse(
        access_token=token,
        role=user["role"],
        username=body.username,
    )


@router.get("/me", summary="Thông tin người dùng hiện tại")
def me(token: str):
    """Kiểm tra token (dùng khi cần, gọi với ?token=...)."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    return {"username": payload["sub"], "role": payload["role"]}
