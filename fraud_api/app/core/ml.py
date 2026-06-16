import os
import joblib
import numpy as np
from threading import Lock
from app.core.config import settings

# ─── In-memory model registry ─────────────────────────────────────────────────
# Lưu: { ml_model_id: (model, scaler_amount, scaler_time) }
_cache: dict = {}
_active_id: int | None = None
_lock = Lock()


def _model_path(filename: str) -> str:
    return os.path.join(settings.MODEL_DIR, filename)


def load_model_by_id(ml_model_id: int, filename: str):
    """Load và cache một model theo id DB. Idempotent."""
    with _lock:
        if ml_model_id not in _cache:
            bundle = joblib.load(_model_path(filename))
            _cache[ml_model_id] = (
                bundle["model"],
                bundle["scaler_amount"],
                bundle["scaler_time"],
            )
    return _cache[ml_model_id]


def set_active_model(ml_model_id: int, filename: str):
    """Đặt model đang active; load vào cache nếu chưa có."""
    global _active_id
    load_model_by_id(ml_model_id, filename)
    with _lock:
        _active_id = ml_model_id


def evict_model(ml_model_id: int):
    """Xóa model khỏi cache (sau khi delete)."""
    global _active_id
    with _lock:
        _cache.pop(ml_model_id, None)
        if _active_id == ml_model_id:
            _active_id = None


def get_active_bundle():
    """Trả về (model, sa, st, active_id). Raise nếu chưa có model active."""
    if _active_id is None:
        raise RuntimeError("Chưa có model nào được kích hoạt. Vui lòng activate một model.")
    return (*_cache[_active_id], _active_id)


# ─── Prediction logic ─────────────────────────────────────────────────────────

def predict_fraud(features: dict) -> dict:
    """
    Dùng model đang active để dự đoán.
    Trả về fraud_probability, is_fraud, risk_level, active_model_id.
    """
    model, scaler_amount, scaler_time, active_id = get_active_bundle()

    scaled_amount = scaler_amount.transform([[features["Amount"]]])[0][0]
    scaled_time   = scaler_time.transform([[features["Time"]]])[0][0]

    v_cols = [features[f"V{i}"] for i in range(1, 29)]
    X = np.array(v_cols + [scaled_amount, scaled_time]).reshape(1, -1)

    proba = model.predict_proba(X)[0][1]
    label = int(proba >= settings.FRAUD_THRESHOLD)

    return {
        "fraud_probability": round(float(proba), 6),
        "is_fraud": bool(label),
        "risk_level": _risk_level(proba),
        "active_model_id": active_id,
    }


def _risk_level(proba: float) -> str:
    if proba >= 0.8:   return "HIGH"
    if proba >= 0.5:   return "MEDIUM"
    if proba >= 0.2:   return "LOW"
    return "SAFE"
