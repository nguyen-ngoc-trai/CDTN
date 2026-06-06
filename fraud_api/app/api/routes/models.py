"""models.py — Quản lý các mô hình ML"""
import os, shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.database import get_db
from app.models.orm import MLModel, User
from app.schemas.schemas import MLModelOut
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.ml.model_manager import model_manager

router = APIRouter()
MODELS_DIR = Path(settings.MODELS_DIR)
MODELS_DIR.mkdir(exist_ok=True)


@router.get("/", response_model=list[MLModelOut])
async def list_models(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(MLModel).order_by(MLModel.created_at.desc()))
    return result.scalars().all()


@router.get("/active", response_model=MLModelOut)
async def get_active_model(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(MLModel).where(MLModel.is_active == True).limit(1))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Không có model nào đang active.")
    return model


@router.post("/upload", response_model=MLModelOut, status_code=201)
async def upload_model(
    file: UploadFile = File(..., description="File model .pkl"),
    name: str = Form(...),
    algorithm: str = Form(...),
    f1_score: float = Form(None),
    precision_score: float = Form(None),
    recall_score: float = Form(None),
    roc_auc: float = Form(None),
    threshold: float = Form(0.5),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    if not file.filename.endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .pkl")

    # Lưu file
    dest = MODELS_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Lưu metadata vào DB
    ml_model = MLModel(
        name=name,
        algorithm=algorithm,
        file_path=file.filename,
        f1_score=f1_score,
        precision_score=precision_score,
        recall_score=recall_score,
        roc_auc=roc_auc,
        threshold=threshold,
        is_active=False,
    )
    db.add(ml_model)
    await db.commit()
    await db.refresh(ml_model)
    return ml_model


@router.put("/{model_id}/activate", response_model=MLModelOut)
async def activate_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Đặt 1 model làm active, bỏ active tất cả model còn lại."""
    ml_model = await db.get(MLModel, model_id)
    if not ml_model:
        raise HTTPException(status_code=404, detail="Model không tồn tại.")

    # Bỏ active tất cả
    await db.execute(update(MLModel).values(is_active=False))
    # Kích hoạt model được chọn
    ml_model.is_active = True
    await db.commit()
    await db.refresh(ml_model)

    # Reload vào memory
    model_path = MODELS_DIR / ml_model.file_path
    model_manager.load_from_path(str(model_path), ml_model)
    return ml_model
