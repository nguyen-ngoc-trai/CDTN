from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL:    str   = "postgresql://postgres:password@localhost:5432/fraud_db"
    MODEL_DIR:       str   = "ml_models"          # thư mục chứa tất cả .pkl
    FRAUD_THRESHOLD: float = 0.5
    APP_ENV:         str   = "development"

    class Config:
        env_file = ".env"

settings = Settings()
