from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


# ═══════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field("analyst", pattern="^(admin|analyst|viewer)$")


class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ═══════════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════════
class TransactionCreate(BaseModel):
    """Schema cho việc nhập 1 giao dịch thủ công."""
    time_seconds: Optional[int] = None
    amount: float = Field(..., gt=0)
    v1: float; v2: float; v3: float; v4: float; v5: float
    v6: float; v7: float; v8: float; v9: float; v10: float
    v11: float; v12: float; v13: float; v14: float; v15: float
    v16: float; v17: float; v18: float; v19: float; v20: float
    v21: float; v22: float; v23: float; v24: float; v25: float
    v26: float; v27: float; v28: float
    actual_class: Optional[int] = Field(None, ge=0, le=1)


class TransactionOut(BaseModel):
    id: UUID
    amount: float
    time_seconds: Optional[int]
    source: str
    created_at: datetime
    # Kết quả dự đoán gần nhất (nếu có)
    latest_prediction: Optional[PredictionSummary] = None
    model_config = {"from_attributes": True}


class TransactionListOut(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════
# PREDICTIONS
# ═══════════════════════════════════════════════════════════════
class PredictRequest(BaseModel):
    """Dự đoán 1 giao dịch đơn lẻ."""
    transaction_id: Optional[UUID] = None   # Nếu đã lưu trong DB
    transaction: Optional[TransactionCreate] = None  # Hoặc gửi dữ liệu trực tiếp
    threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

    @field_validator("transaction")
    @classmethod
    def must_have_source(cls, v, info):
        if v is None and info.data.get("transaction_id") is None:
            raise ValueError("Phải cung cấp transaction_id hoặc transaction")
        return v


class PredictionSummary(BaseModel):
    id: UUID
    fraud_probability: float
    is_fraud: bool
    risk_level: str
    predicted_at: datetime
    model_config = {"from_attributes": True}


class PredictionOut(PredictionSummary):
    transaction_id: UUID
    model_id: UUID
    threshold_used: float
    feature_importance: Optional[dict] = None
    processing_time_ms: Optional[int] = None


class BatchPredictRequest(BaseModel):
    """Dự đoán hàng loạt từ danh sách batch_id."""
    batch_id: UUID
    threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class BatchPredictOut(BaseModel):
    batch_id: UUID
    total: int
    fraud_count: int
    fraud_rate: float
    predictions: List[PredictionOut]


# ═══════════════════════════════════════════════════════════════
# ML MODELS
# ═══════════════════════════════════════════════════════════════
class MLModelOut(BaseModel):
    id: UUID
    name: str
    algorithm: str
    f1_score: Optional[float]
    precision_score: Optional[float]
    recall_score: Optional[float]
    roc_auc: Optional[float]
    threshold: Optional[float]
    is_active: bool
    trained_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════
class AlertOut(BaseModel):
    id: UUID
    alert_type: str
    message: str
    is_read: bool
    is_resolved: bool
    created_at: datetime
    prediction: Optional[PredictionSummary] = None
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════
class DashboardStats(BaseModel):
    total_transactions: int
    fraud_count: int
    legit_count: int
    fraud_rate_pct: float
    avg_amount: float
    total_fraud_amount: float
    unread_alerts: int


class TimeSeriesPoint(BaseModel):
    date: str
    total: int
    fraud: int
    fraud_rate: float


# ═══════════════════════════════════════════════════════════════
# Forward ref update
# ═══════════════════════════════════════════════════════════════
TransactionOut.model_rebuild()
