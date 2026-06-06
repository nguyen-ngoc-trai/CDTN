from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import auth, transactions, predictions, models, alerts, reports
from app.db.database import engine
from app.db import base  # noqa: F401 – import all models so SQLAlchemy creates tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    # Load active ML model vào memory khi khởi động
    from app.ml.model_manager import model_manager
    await model_manager.load_active_model()
    yield
    # Cleanup khi shutdown
    model_manager.unload()


app = FastAPI(
    title="Fraud Detection API",
    description="API phát hiện gian lận giao dịch tài chính sử dụng Machine Learning",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/v1/transactions",  tags=["Transactions"])
app.include_router(predictions.router,  prefix="/api/v1/predictions",   tags=["Predictions"])
app.include_router(models.router,       prefix="/api/v1/models",        tags=["ML Models"])
app.include_router(alerts.router,       prefix="/api/v1/alerts",        tags=["Alerts"])
app.include_router(reports.router,      prefix="/api/v1/reports",       tags=["Reports"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "Fraud Detection API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health_check():
    from app.ml.model_manager import model_manager
    return {
        "status": "healthy",
        "model_loaded": model_manager.is_loaded,
        "model_name": model_manager.active_model_name,
    }
