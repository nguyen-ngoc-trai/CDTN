import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core import ml as ml_service
from app.models.transaction import Transaction, Prediction, MLModel
from app.schemas.transaction import (
    TransactionInput, PredictionResult, BatchUploadResponse
)

router = APIRouter(prefix="/predict", tags=["Dự đoán gian lận"])


# ─── Helper ──────────────────────────────────────────────────────────────────

def _save_transaction_and_predict(data: dict, db: Session, source: str = "api"):
    """Lưu giao dịch + kết quả dự đoán. Trả về Prediction ORM."""
    # 1. Lưu giao dịch
    txn = Transaction(
        time_seconds=data["Time"],
        amount=data["Amount"],
        actual_class=data.get("actual_class"),
        source=source,
        note=data.get("note"),
        **{f"v{i}": data[f"V{i}"] for i in range(1, 29)},
    )
    db.add(txn)
    db.flush()

    # 2. Gọi model đang active
    try:
        result = ml_service.predict_fraud(data)
    except RuntimeError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))

    # 3. Lấy tên model để snapshot
    active_record = db.query(MLModel).filter(MLModel.id == result["active_model_id"]).first()
    model_version = active_record.name if active_record else "unknown"

    # 4. Lưu prediction
    pred = Prediction(
        transaction_id=txn.id,
        ml_model_id=result["active_model_id"],
        fraud_probability=result["fraud_probability"],
        is_fraud=result["is_fraud"],
        risk_level=result["risk_level"],
        model_version=model_version,
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/single", response_model=PredictionResult, summary="Dự đoán một giao dịch")
def predict_single(payload: TransactionInput, db: Session = Depends(get_db)):
    """Nhận thông tin một giao dịch, trả về xác suất gian lận và mức rủi ro."""
    return _save_transaction_and_predict(payload.model_dump(), db, source="api")


@router.post("/batch", response_model=BatchUploadResponse, summary="Upload CSV để dự đoán hàng loạt")
async def predict_batch(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload file CSV (Time, Amount, V1-V28, tuỳ chọn Class). Dự đoán bằng model đang active."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file CSV.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được CSV: {e}")

    required_cols = {"Time", "Amount"} | {f"V{i}" for i in range(1, 29)}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Thiếu cột: {missing}")

    fraud_count = normal_count = errors = 0
    for _, row in df.iterrows():
        try:
            data = {col: row[col] for col in required_cols}
            data["actual_class"] = int(row["Class"]) if "Class" in df.columns else None
            data["note"] = None
            pred = _save_transaction_and_predict(data, db, source="batch_upload")
            if pred.is_fraud:
                fraud_count += 1
            else:
                normal_count += 1
        except HTTPException:
            raise
        except Exception:
            errors += 1

    return BatchUploadResponse(
        total_rows=len(df),
        processed=fraud_count + normal_count,
        fraud_count=fraud_count,
        normal_count=normal_count,
        errors=errors,
        message=f"Xử lý xong {fraud_count + normal_count}/{len(df)} giao dịch.",
    )
