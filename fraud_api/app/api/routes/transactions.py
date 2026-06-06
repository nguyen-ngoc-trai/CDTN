"""transactions.py"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.orm import Transaction, User
from app.schemas.schemas import TransactionCreate, TransactionOut, TransactionListOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=TransactionListOut)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Transaction)
    if source:
        q = q.where(Transaction.source == source)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar()

    q = q.order_by(Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = (await db.execute(q)).scalars().all()
    return TransactionListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("/", response_model=TransactionOut, status_code=201)
async def create_transaction(
    body: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = Transaction(**body.model_dump(), user_id=current_user.id, source="manual")
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


@router.get("/{txn_id}", response_model=TransactionOut)
async def get_transaction(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    txn = await db.get(Transaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    return txn
