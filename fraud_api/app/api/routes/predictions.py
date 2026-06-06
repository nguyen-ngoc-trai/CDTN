"""
/api/v1/predictions — Dự đoán gian lận giao dịch
"""
import uuid
import uuid as uuid_lib
import json
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import text
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import pandas as pd
import io

from app.db.database import get_db
from app.core.security import get_current_user, require_role
from app.models.orm import Transaction, Prediction, MLModel, User
from app.schemas.schemas import (
    PredictRequest, PredictionOut, BatchPredictRequest, BatchPredictOut,
)
from app.ml.model_manager import model_manager
router = APIRouter()


def _txn_to_dict(txn: Transaction) -> dict:
    """Chuyển ORM Transaction → dict feature cho model."""
    return {
        "Time": txn.time_seconds or 0,
        "Amount": float(txn.amount),
        **{f"V{i}": float(getattr(txn, f"v{i}") or 0) for i in range(1, 29)},
    }


async def _save_prediction(db: AsyncSession, txn_id, model_id, result: dict) -> Prediction:

    pred_id = uuid_lib.uuid4()
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO predictions
                (id, transaction_id, model_id, fraud_probability, is_fraud,
                 threshold_used, risk_level, processing_time_ms, predicted_at)
            VALUES
                (:id, :txn_id, :model_id, :fraud_prob, :is_fraud,
                 :threshold, :risk_level, :proc_ms, :predicted_at)
        """),
        {
            "id": str(pred_id),
            "txn_id": str(txn_id),
            "model_id": str(model_id),
            "fraud_prob": str(result["fraud_probability"]),
            "is_fraud": result["is_fraud"],
            "threshold": str(result["threshold_used"]),
            "risk_level": result["risk_level"],
            "proc_ms": result.get("processing_time_ms"),
            "predicted_at": now,
        }
    )

    pred = Prediction(
        id=pred_id,
        transaction_id=txn_id,
        model_id=model_id,
        fraud_probability=result["fraud_probability"],
        is_fraud=result["is_fraud"],
        threshold_used=result["threshold_used"],
        risk_level=result["risk_level"],
        feature_importance=None,
        processing_time_ms=result.get("processing_time_ms"),
        predicted_at=now,
    )
    return pred


# ─────────────────────────────────────────────────────────────
# POST /predict — dự đoán 1 giao dịch
# ─────────────────────────────────────────────────────────────
@router.post("/predict", response_model=PredictionOut, summary="Dự đoán 1 giao dịch")
async def predict_single(
    body: PredictRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not model_manager.is_loaded:
        raise HTTPException(status_code=503, detail="Model chưa được tải. Liên hệ admin.")

    # Lấy/tạo transaction
    if body.transaction_id:
        txn = await db.get(Transaction, body.transaction_id)
        if txn is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    else:
        txn = Transaction(**body.transaction.model_dump(), user_id=current_user.id, source="api")
        db.add(txn)
        await db.flush()

    # Lấy active model
    result_q = await db.execute(select(MLModel).where(MLModel.is_active == True).limit(1))
    ml_model = result_q.scalar_one_or_none()
    if ml_model is None:
        raise HTTPException(status_code=503, detail="Không có model active.")

    # Dự đoán
    result = model_manager.predict(_txn_to_dict(txn), threshold=body.threshold)

    # Lưu kết quả
    pred = await _save_prediction(db, txn.id, ml_model.id, result)
    await db.commit()
    await db.refresh(pred)
    return pred


# ─────────────────────────────────────────────────────────────
# POST /predict/batch — dự đoán hàng loạt theo batch_id
# ─────────────────────────────────────────────────────────────
@router.post("/predict/batch", response_model=BatchPredictOut, summary="Dự đoán hàng loạt")
async def predict_batch(
    body: BatchPredictRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not model_manager.is_loaded:
        raise HTTPException(status_code=503, detail="Model chưa được tải.")

    # Lấy tất cả transaction trong batch
    result_q = await db.execute(
        select(Transaction).where(Transaction.batch_id == body.batch_id)
    )
    transactions = result_q.scalars().all()

    if not transactions:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch trong batch.")

    result_model = await db.execute(select(MLModel).where(MLModel.is_active == True).limit(1))
    ml_model = result_model.scalar_one_or_none()
    if ml_model is None:
        raise HTTPException(status_code=503, detail="Không có model active.")

    # Dự đoán batch
    feature_dicts = [_txn_to_dict(t) for t in transactions]
    results = model_manager.predict_batch(feature_dicts, threshold=body.threshold)

    # Lưu tất cả predictions
    predictions = []
    for txn, res in zip(transactions, results):
        pred = await _save_prediction(db, txn.id, ml_model.id, res)
        predictions.append(pred)

    await db.commit()

    fraud_count = sum(1 for p in predictions if p.is_fraud)
    return BatchPredictOut(
        batch_id=body.batch_id,
        total=len(predictions),
        fraud_count=fraud_count,
        fraud_rate=round(fraud_count / len(predictions) * 100, 2),
        predictions=predictions,
    )


# ─────────────────────────────────────────────────────────────
# POST /predict/upload — upload CSV, dự đoán hàng loạt
# ─────────────────────────────────────────────────────────────
@router.post("/predict/upload", response_model=BatchPredictOut, summary="Upload CSV và dự đoán")
async def predict_upload(
    file: UploadFile = File(..., description="File CSV định dạng Credit Card Fraud Detection"),
    threshold: Optional[float] = Query(None, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not model_manager.is_loaded:
        raise HTTPException(status_code=503, detail="Model chưa được tải.")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .csv")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Không thể đọc file CSV.")

    # Chuẩn hóa tên cột
    df.columns = [c.strip() for c in df.columns]
    required = ["Amount"] + [f"V{i}" for i in range(1, 29)]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Thiếu cột: {', '.join(missing)}")

    result_model = await db.execute(select(MLModel).where(MLModel.is_active == True).limit(1))
    ml_model = result_model.scalar_one_or_none()
    if ml_model is None:
        raise HTTPException(status_code=503, detail="Không có model active.")

    batch_id = uuid.uuid4()

    # Lưu transactions + chuẩn bị feature_dicts trong 1 vòng lặp duy nhất
    transactions = []
    feature_dicts = []
    for _, row in df.iterrows():
        txn = Transaction(
            user_id=current_user.id,
            time_seconds=int(row.get("Time", 0)),
            amount=float(row["Amount"]),
            batch_id=batch_id,
            source="upload",
            actual_class=int(row["Class"]) if "Class" in row and not pd.isna(row["Class"]) else None,
            **{f"v{i}": float(row.get(f"V{i}", 0)) for i in range(1, 29)},
        )
        db.add(txn)
        transactions.append(txn)
        feature_dicts.append({
            "Time": float(row.get("Time", 0)),
            "Amount": float(row["Amount"]),
            **{f"V{i}": float(row.get(f"V{i}", 0)) for i in range(1, 29)},
        })

    await db.flush()

    # Dự đoán batch
    results = model_manager.predict_batch(feature_dicts, threshold=threshold)

    predictions = []
    for txn, res in zip(transactions, results):
        pred = await _save_prediction(db, txn.id, ml_model.id, res)
        predictions.append(pred)

    await db.commit()

    fraud_count = sum(1 for p in predictions if p.is_fraud)
    return BatchPredictOut(
        batch_id=batch_id,
        total=len(predictions),
        fraud_count=fraud_count,
        fraud_rate=round(fraud_count / len(predictions) * 100, 2),
        predictions=predictions,
    )


# ─────────────────────────────────────────────────────────────
# GET /predictions — lịch sử dự đoán
# ─────────────────────────────────────────────────────────────
@router.get("/", response_model=list[PredictionOut], summary="Lịch sử dự đoán")
async def list_predictions(
    is_fraud: Optional[bool] = None,
    risk_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Prediction)
    if is_fraud is not None:
        q = q.where(Prediction.is_fraud == is_fraud)
    if risk_level:
        q = q.where(Prediction.risk_level == risk_level)
    q = q.order_by(Prediction.predicted_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()