"""alerts.py"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.orm import Alert, User
from app.schemas.schemas import AlertOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Alert)
    if unread_only:
        q = q.where(Alert.is_read == False)
    q = q.order_by(Alert.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.put("/{alert_id}/read")
async def mark_read(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy alert.")
    alert.is_read = True
    await db.commit()
    return {"message": "Đã đánh dấu đã đọc."}


@router.put("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    from datetime import datetime, timezone
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy alert.")
    alert.is_resolved = True
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Alert đã được xử lý."}
