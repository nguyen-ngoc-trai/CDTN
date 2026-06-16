from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.database import Base, engine, SessionLocal
from app.routers import predict, transactions, analytics, ml_models
from app.routers.auth import router as auth_router
from app.routers.ml_models import sync_active_model_on_startup

# Tạo tất cả bảng (bao gồm ml_models mới)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fraud Detection API",
    description=(
        "API phát hiện gian lận giao dịch thẻ tín dụng. "
        "Hỗ trợ quản lý nhiều model ML — chỉ 1 model active tại một thời điểm."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api/v1")
app.include_router(ml_models.router,    prefix="/api/v1")
app.include_router(predict.router,      prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(analytics.router,    prefix="/api/v1")


# ─── Startup: load model active vào cache ────────────────────────────────────
@app.on_event("startup")
def on_startup():
    db: Session = SessionLocal()
    try:
        sync_active_model_on_startup(db)
    finally:
        db.close()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
