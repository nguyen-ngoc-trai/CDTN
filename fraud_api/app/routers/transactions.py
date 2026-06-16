import csv
import io
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.core.database import get_db
from app.models.transaction import Transaction, Prediction
from app.schemas.transaction import TransactionDetail

router = APIRouter(prefix="/transactions", tags=["Giao dịch"])


@router.get("/", response_model=List[TransactionDetail], summary="Danh sách giao dịch")
def list_transactions(
    skip:       int          = Query(0, ge=0),
    limit:      int          = Query(50, le=500),
    is_fraud:   Optional[bool]  = Query(None, description="Lọc theo gian lận (true/false)"),
    risk_level: Optional[str]   = Query(None, description="SAFE | LOW | MEDIUM | HIGH"),
    source:     Optional[str]   = Query(None, description="api | batch_upload"),
    db: Session = Depends(get_db),
):
    """Trả về danh sách giao dịch, hỗ trợ lọc và phân trang."""
    q = db.query(Transaction).options(joinedload(Transaction.prediction))

    if is_fraud is not None:
        q = q.join(Transaction.prediction).filter(
            Transaction.prediction.property.mapper.class_.is_fraud == is_fraud
        )
    if risk_level:
        q = q.join(Transaction.prediction).filter(
            Transaction.prediction.property.mapper.class_.risk_level == risk_level.upper()
        )
    if source:
        q = q.filter(Transaction.source == source)

    transactions = q.order_by(desc(Transaction.created_at)).offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionDetail, summary="Chi tiết một giao dịch")
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    txn = (
        db.query(Transaction)
        .options(joinedload(Transaction.prediction))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    return txn


@router.get("/high-risk/count", summary="Số giao dịch HIGH mới chưa đọc")
def high_risk_count(
    since_id: int = Query(0, description="Chỉ đếm các giao dịch có id > since_id"),
    db: Session = Depends(get_db),
):
    """
    Trả về số lượng giao dịch HIGH risk có id > since_id.
    Frontend dùng để hiển thị badge thông báo.
    """
    count = (
        db.query(Transaction)
        .join(Prediction)
        .filter(Prediction.risk_level == "HIGH")
        .filter(Transaction.id > since_id)
        .count()
    )
    latest = (
        db.query(Transaction.id)
        .join(Prediction)
        .filter(Prediction.risk_level == "HIGH")
        .order_by(desc(Transaction.id))
        .first()
    )
    return {
        "count": count,
        "latest_id": latest[0] if latest else 0,
    }


@router.get("/high-risk/list", response_model=List[TransactionDetail], summary="Danh sách giao dịch rủi ro cao")
def high_risk_transactions(limit: int = Query(20, le=500), db: Session = Depends(get_db)):
    """Trả về các giao dịch có risk_level = HIGH, sắp xếp theo xác suất giảm dần."""
    txns = (
        db.query(Transaction)
        .options(joinedload(Transaction.prediction))
        .join(Prediction)
        .filter(Prediction.risk_level == "HIGH")
        .order_by(desc(Prediction.fraud_probability))
        .limit(limit)
        .all()
    )
    return txns


@router.get(
    "/high-risk/export",
    summary="Xuất CSV giao dịch rủi ro cao",
    response_class=StreamingResponse,
    responses={
        200: {
            "description": "File CSV chứa danh sách giao dịch rủi ro cao",
            "content": {"text/csv": {}},
        }
    },
)
def export_high_risk_csv(
    limit: int = Query(500, le=2000, description="Số giao dịch tối đa xuất ra"),
    min_prob: float = Query(0.0, ge=0.0, le=1.0, description="Xác suất tối thiểu (0.0–1.0)"),
    db: Session = Depends(get_db),
):
    """
    Xuất danh sách giao dịch rủi ro cao ra file **CSV**.

    - Lọc theo `risk_level = HIGH`
    - Tuỳ chọn lọc thêm theo `min_prob` (xác suất gian lận tối thiểu)
    - Sắp xếp theo xác suất gian lận giảm dần
    """
    q = (
        db.query(Transaction)
        .options(joinedload(Transaction.prediction))
        .join(Prediction)
        .filter(Prediction.risk_level == "HIGH")
    )
    if min_prob > 0:
        q = q.filter(Prediction.fraud_probability >= min_prob)

    txns = q.order_by(desc(Prediction.fraud_probability)).limit(limit).all()

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "transaction_id",
        "amount",
        "time_seconds",
        "source",
        "fraud_probability_%",
        "risk_level",
        "is_fraud (1=Yes/0=No)",
        "actual_class",
        "model_version",
        "predicted_at",
        "created_at",
        "note",
    ])

    # Rows
    for txn in txns:
        pred = txn.prediction
        writer.writerow([
            txn.id,
            f"{txn.amount:.2f}",
            f"{txn.time_seconds:.0f}",
            txn.source,
            f"{(pred.fraud_probability * 100):.2f}" if pred else "",
            pred.risk_level if pred else "",
            "1" if (pred and pred.is_fraud) else "0",
            txn.actual_class if txn.actual_class is not None else "",
            pred.model_version or "" if pred else "",
            pred.predicted_at.strftime("%Y-%m-%d %H:%M:%S") if pred and pred.predicted_at else "",
            txn.created_at.strftime("%Y-%m-%d %H:%M:%S") if txn.created_at else "",
            txn.note or "",
        ])

    output.seek(0)
    filename = f"high_risk_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",   # utf-8-sig giúp Excel đọc đúng tiếng Việt
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Total-Records": str(len(txns)),
        },
    )
