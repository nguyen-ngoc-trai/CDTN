from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ────────────────────────────────────────────────
# Transaction schemas
# ────────────────────────────────────────────────

class TransactionInput(BaseModel):
    """Payload gửi lên để dự đoán một giao dịch đơn lẻ."""
    Time:   float = Field(..., description="Giây kể từ giao dịch đầu tiên")
    Amount: float = Field(..., gt=0, description="Số tiền giao dịch (USD)")
    V1:  float; V2:  float; V3:  float; V4:  float
    V5:  float; V6:  float; V7:  float; V8:  float
    V9:  float; V10: float; V11: float; V12: float
    V13: float; V14: float; V15: float; V16: float
    V17: float; V18: float; V19: float; V20: float
    V21: float; V22: float; V23: float; V24: float
    V25: float; V26: float; V27: float; V28: float
    actual_class: Optional[int] = Field(None, description="Nhãn thật (0/1), nếu có")
    note: Optional[str] = None

    model_config = {"json_schema_extra": {
        "example": {
            "Time": 406, "Amount": 149.62,
            "V1": -1.359807, "V2": -0.072781, "V3": 2.536347,
            "V4": 1.378155, "V5": -0.338321, "V6": 0.462388,
            "V7": 0.239599, "V8": 0.098698, "V9": 0.363787,
            "V10": 0.090794, "V11": -0.551600, "V12": -0.617801,
            "V13": -0.991390, "V14": -0.311169, "V15": 1.468177,
            "V16": -0.470401, "V17": 0.207971, "V18": 0.025791,
            "V19": 0.403993, "V20": 0.251412, "V21": -0.018307,
            "V22": 0.277838, "V23": -0.110474, "V24": 0.066928,
            "V25": 0.128539, "V26": -0.189115, "V27": 0.133558,
            "V28": -0.021053
        }
    }}


class PredictionResult(BaseModel):
    """Kết quả trả về sau khi dự đoán."""
    transaction_id:    int
    fraud_probability: float
    is_fraud:          bool
    risk_level:        str
    predicted_at:      datetime

    model_config = {"from_attributes": True}


class TransactionDetail(BaseModel):
    """Chi tiết một giao dịch kèm kết quả dự đoán."""
    id:            int
    time_seconds:  float
    amount:        float
    actual_class:  Optional[int]
    source:        str
    note:          Optional[str]
    created_at:    datetime
    prediction:    Optional[PredictionResult]

    model_config = {"from_attributes": True}


# ────────────────────────────────────────────────
# Batch upload schema
# ────────────────────────────────────────────────

class BatchUploadResponse(BaseModel):
    total_rows:    int
    processed:     int
    fraud_count:   int
    normal_count:  int
    errors:        int
    message:       str


# ────────────────────────────────────────────────
# Dashboard / stats schemas
# ────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_transactions: int
    total_fraud:        int
    total_normal:       int
    fraud_rate_pct:     float
    high_risk_count:    int
    medium_risk_count:  int
    low_risk_count:     int
    safe_count:         int


class TimeSeriesPoint(BaseModel):
    date:         str
    total:        int
    fraud:        int
    normal:       int


class FeatureImportanceItem(BaseModel):
    feature:    str
    importance: float
