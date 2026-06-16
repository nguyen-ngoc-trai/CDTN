from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.core.database import get_db
from app.models.transaction import Transaction, Prediction
from app.schemas.transaction import DashboardStats, TimeSeriesPoint, FeatureImportanceItem

router = APIRouter(prefix="/analytics", tags=["Phân tích & Dashboard"])

# Feature importance tĩnh từ kết quả Random Forest (Tuần 5)
_FEATURE_IMPORTANCE = [
    ("V14", 0.1523), ("V4",  0.1187), ("V12", 0.0934),
    ("V10", 0.0821), ("V17", 0.0756), ("V3",  0.0698),
    ("V11", 0.0612), ("V7",  0.0589), ("V16", 0.0534),
    ("scaled_amount", 0.0412),
]


@router.get("/dashboard", response_model=DashboardStats, summary="Thống kê tổng quan")
def dashboard_stats(db: Session = Depends(get_db)):
    """Tổng số giao dịch, tỷ lệ gian lận và phân bố mức rủi ro."""
    total = db.query(Transaction).count()
    fraud = db.query(Prediction).filter(Prediction.is_fraud == True).count()
    normal = total - fraud

    risk_counts = (
        db.query(Prediction.risk_level, func.count(Prediction.id))
        .group_by(Prediction.risk_level)
        .all()
    )
    risk_map = {r: c for r, c in risk_counts}

    return DashboardStats(
        total_transactions=total,
        total_fraud=fraud,
        total_normal=normal,
        fraud_rate_pct=round(fraud / total * 100, 4) if total else 0.0,
        high_risk_count=risk_map.get("HIGH", 0),
        medium_risk_count=risk_map.get("MEDIUM", 0),
        low_risk_count=risk_map.get("LOW", 0),
        safe_count=risk_map.get("SAFE", 0),
    )


@router.get("/timeseries", response_model=List[TimeSeriesPoint], summary="Biểu đồ giao dịch theo ngày")
def timeseries(db: Session = Depends(get_db)):
    """Số lượng giao dịch bình thường và gian lận theo từng ngày."""
    rows = (
        db.query(
            cast(Transaction.created_at, Date).label("date"),
            func.count(Transaction.id).label("total"),
            func.sum(
                func.cast(Prediction.is_fraud, db.bind.dialect.type_descriptor(__import__("sqlalchemy").Integer))
            ).label("fraud"),
        )
        .join(Prediction, isouter=True)
        .group_by("date")
        .order_by("date")
        .all()
    )

    result = []
    for row in rows:
        fraud  = int(row.fraud or 0)
        total  = int(row.total or 0)
        result.append(TimeSeriesPoint(
            date=str(row.date),
            total=total,
            fraud=fraud,
            normal=total - fraud,
        ))
    return result


@router.get("/feature-importance", response_model=List[FeatureImportanceItem], summary="Feature importance")
def feature_importance():
    """Top features ảnh hưởng đến dự đoán gian lận (kết quả từ Random Forest)."""
    return [
        FeatureImportanceItem(feature=f, importance=i)
        for f, i in _FEATURE_IMPORTANCE
    ]
