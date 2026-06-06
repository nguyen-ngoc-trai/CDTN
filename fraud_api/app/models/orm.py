import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Numeric, Integer,
    ForeignKey, Text, ARRAY, DateTime, SmallInteger,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Users ─────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username        = Column(String(100), unique=True, nullable=False)
    email           = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(String(20), nullable=False, default="analyst")
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    transactions    = relationship("Transaction", back_populates="user")
    alerts          = relationship("Alert", back_populates="user", foreign_keys="Alert.user_id")


# ── ML Models ─────────────────────────────────────────────────
class MLModel(Base):
    __tablename__ = "models"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(100), nullable=False)
    algorithm       = Column(String(50), nullable=False)
    file_path       = Column(String(500), nullable=False)
    feature_names   = Column(ARRAY(Text))
    hyperparameters = Column(JSONB)
    f1_score        = Column(Numeric)
    precision_score = Column(Numeric)
    recall_score    = Column(Numeric)
    roc_auc         = Column(Numeric)
    threshold       = Column(Numeric, default=0.5)
    is_active       = Column(Boolean, nullable=False, default=False)
    trained_at      = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)

    predictions     = relationship("Prediction", back_populates="model")


# ── Transactions ──────────────────────────────────────────────
class Transaction(Base):
    __tablename__ = "transactions"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    time_seconds = Column(Integer)
    amount       = Column(Numeric, nullable=False)
    # V1 – V28 PCA features
    v1  = Column(Numeric); v2  = Column(Numeric); v3  = Column(Numeric)
    v4  = Column(Numeric); v5  = Column(Numeric); v6  = Column(Numeric)
    v7  = Column(Numeric); v8  = Column(Numeric); v9  = Column(Numeric)
    v10 = Column(Numeric); v11 = Column(Numeric); v12 = Column(Numeric)
    v13 = Column(Numeric); v14 = Column(Numeric); v15 = Column(Numeric)
    v16 = Column(Numeric); v17 = Column(Numeric); v18 = Column(Numeric)
    v19 = Column(Numeric); v20 = Column(Numeric); v21 = Column(Numeric)
    v22 = Column(Numeric); v23 = Column(Numeric); v24 = Column(Numeric)
    v25 = Column(Numeric); v26 = Column(Numeric); v27 = Column(Numeric)
    v28 = Column(Numeric)
    actual_class = Column(SmallInteger)
    source       = Column(String(20), default="upload")
    batch_id     = Column(UUID(as_uuid=True))
    created_at   = Column(DateTime(timezone=True), default=now_utc)

    user         = relationship("User", back_populates="transactions")
    predictions  = relationship("Prediction", back_populates="transaction", cascade="all, delete")


# ── Predictions ───────────────────────────────────────────────
class Prediction(Base):
    __tablename__ = "predictions"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id     = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    model_id           = Column(UUID(as_uuid=True), ForeignKey("models.id"), nullable=False)
    fraud_probability  = Column(Numeric, nullable=False)
    is_fraud           = Column(Boolean, nullable=False)
    threshold_used     = Column(Numeric, nullable=False)
    risk_level         = Column(String(10), nullable=False)
    feature_importance = Column(Text)
    processing_time_ms = Column(Integer)
    predicted_at       = Column(DateTime(timezone=True), default=now_utc)

    transaction  = relationship("Transaction", back_populates="predictions")
    model        = relationship("MLModel", back_populates="predictions")
    alerts       = relationship("Alert", back_populates="prediction", cascade="all, delete")


# ── Alerts ────────────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(UUID(as_uuid=True), ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    alert_type    = Column(String(20), nullable=False)
    message       = Column(Text, nullable=False)
    is_read       = Column(Boolean, nullable=False, default=False)
    is_resolved   = Column(Boolean, nullable=False, default=False)
    resolved_by   = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved_at   = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=now_utc)

    prediction    = relationship("Prediction", back_populates="alerts")
    user          = relationship("User", back_populates="alerts", foreign_keys=[user_id])