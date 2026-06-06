"""reports.py — Dashboard stats và xuất báo cáo"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, text
import io

from app.db.database import get_db
from app.models.orm import Transaction, Prediction, Alert, User
from app.schemas.schemas import DashboardStats, TimeSeriesPoint
from app.core.security import get_current_user

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tổng quan toàn hệ thống cho dashboard chính."""
    # Tổng giao dịch & dự đoán
    total = (await db.execute(select(func.count(Transaction.id)))).scalar() or 0
    fraud = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.is_fraud == True)
    )).scalar() or 0
    legit = total - fraud

    # Tổng tiền giao dịch gian lận
    fraud_amount = (await db.execute(
        select(func.sum(Transaction.amount))
        .join(Prediction, Prediction.transaction_id == Transaction.id)
        .where(Prediction.is_fraud == True)
    )).scalar() or 0

    avg_amount = (await db.execute(select(func.avg(Transaction.amount)))).scalar() or 0

    unread_alerts = (await db.execute(
        select(func.count(Alert.id)).where(Alert.is_read == False)
    )).scalar() or 0

    return DashboardStats(
        total_transactions=total,
        fraud_count=fraud,
        legit_count=legit,
        fraud_rate_pct=round(fraud / max(total, 1) * 100, 2),
        avg_amount=round(float(avg_amount), 2),
        total_fraud_amount=round(float(fraud_amount), 2),
        unread_alerts=unread_alerts,
    )


@router.get("/timeseries", response_model=list[TimeSeriesPoint])
async def timeseries(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Thống kê giao dịch theo ngày trong N ngày gần nhất."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = await db.execute(text("""
        SELECT
            DATE_TRUNC('day', t.created_at)::DATE  AS stat_date,
            COUNT(t.id)                             AS total,
            COUNT(p.id) FILTER (WHERE p.is_fraud)  AS fraud
        FROM transactions t
        LEFT JOIN predictions p ON p.transaction_id = t.id
        WHERE t.created_at >= :since
        GROUP BY 1
        ORDER BY 1 DESC
    """), {"since": since})

    result = []
    for row in rows:
        total = row.total or 0
        fraud = row.fraud or 0
        result.append(TimeSeriesPoint(
            date=str(row.stat_date),
            total=total,
            fraud=fraud,
            fraud_rate=round(fraud / max(total, 1) * 100, 2),
        ))
    return result


@router.get("/export/csv")
async def export_csv(
    is_fraud: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Xuất danh sách giao dịch nghi ngờ ra file CSV."""
    import csv

    q = (
        select(
            Transaction.id, Transaction.amount, Transaction.time_seconds,
            Transaction.created_at, Prediction.fraud_probability,
            Prediction.is_fraud, Prediction.risk_level,
        )
        .join(Prediction, Prediction.transaction_id == Transaction.id)
        .order_by(Prediction.fraud_probability.desc())
    )
    if is_fraud is not None:
        q = q.where(Prediction.is_fraud == is_fraud)

    rows = (await db.execute(q)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Amount", "Time(s)", "Created At", "Fraud Probability", "Is Fraud", "Risk Level"])
    for row in rows:
        writer.writerow([
            str(row.id), row.amount, row.time_seconds,
            row.created_at.isoformat() if row.created_at else "",
            row.fraud_probability, row.is_fraud, row.risk_level,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fraud_transactions.csv"},
    )
