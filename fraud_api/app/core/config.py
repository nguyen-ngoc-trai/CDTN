from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/fraud_db"

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── JWT ───────────────────────────────────────────────────
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8   # 8 giờ

    # ── CORS ──────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",   # React dev server
        "http://localhost:5173",   # Vite dev server
    ]

    # ── ML Model ──────────────────────────────────────────────
    MODELS_DIR: str = "ml_models"          # Thư mục chứa file .pkl
    DEFAULT_THRESHOLD: float = 0.3

    # ── Upload ────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Risk levels ───────────────────────────────────────────
    RISK_LOW_THRESHOLD: float = 0.3
    RISK_MEDIUM_THRESHOLD: float = 0.6
    RISK_HIGH_THRESHOLD: float = 0.85

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


def get_risk_level(probability: float) -> str:
    """Chuyển xác suất gian lận sang mức rủi ro."""
    if probability < settings.RISK_LOW_THRESHOLD:
        return "low"
    elif probability < settings.RISK_MEDIUM_THRESHOLD:
        return "medium"
    elif probability < settings.RISK_HIGH_THRESHOLD:
        return "high"
    return "critical"
