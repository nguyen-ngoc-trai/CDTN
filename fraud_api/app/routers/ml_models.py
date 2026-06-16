import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core import ml as ml_service
from app.models.transaction import MLModel
from app.schemas.ml_model import MLModelOut, MLModelActivateResponse, MLModelUploadResponse

router = APIRouter(prefix="/models", tags=["Quản lý Model"])

ALLOWED_ALGORITHMS = {"RandomForest", "LogisticRegression", "IsolationForest", "NeuralNetwork", "Other"}


# ─── Startup: sync active model từ DB vào cache ───────────────────────────────

def sync_active_model_on_startup(db: Session):
    """Gọi khi app khởi động để load model active vào cache."""
    active = db.query(MLModel).filter(MLModel.is_active == True).first()
    if active:
        try:
            ml_service.set_active_model(active.id, active.filename)
        except Exception as e:
            print(f"[WARNING] Không load được model active '{active.filename}': {e}")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[MLModelOut], summary="Danh sách tất cả model")
def list_models(db: Session = Depends(get_db)):
    return db.query(MLModel).order_by(MLModel.uploaded_at.desc()).all()


@router.get("/active", response_model=MLModelOut, summary="Model đang được kích hoạt")
def get_active_model(db: Session = Depends(get_db)):
    model = db.query(MLModel).filter(MLModel.is_active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="Chưa có model nào được kích hoạt.")
    return model


@router.post("/upload", response_model=MLModelUploadResponse, summary="Upload model .pkl mới")
async def upload_model(
    file:        UploadFile = File(..., description="File .pkl (joblib bundle)"),
    name:        str        = Form(..., description="Tên hiển thị, VD: Random Forest v3"),
    algorithm:   str        = Form(..., description="RandomForest | LogisticRegression | IsolationForest | ..."),
    description: str        = Form(""),
    db:          Session    = Depends(get_db),
):
    """
    Upload file .pkl lên server.  
    Bundle phải có cấu trúc: `{"model": ..., "scaler_amount": ..., "scaler_time": ...}`
    """
    if not file.filename.endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .pkl")
    if algorithm not in ALLOWED_ALGORITHMS:
        raise HTTPException(status_code=400, detail=f"algorithm phải là một trong: {ALLOWED_ALGORITHMS}")

    # Tránh trùng tên file trên disk
    dest_path = os.path.join(settings.MODEL_DIR, file.filename)
    if os.path.exists(dest_path):
        raise HTTPException(status_code=409, detail=f"File '{file.filename}' đã tồn tại.")

    # Lưu file
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Validate bundle có đủ key không
    try:
        import joblib
        bundle = joblib.load(dest_path)
        for key in ("model", "scaler_amount", "scaler_time"):
            if key not in bundle:
                raise ValueError(f"Thiếu key '{key}' trong bundle.")
    except Exception as e:
        os.remove(dest_path)
        raise HTTPException(status_code=422, detail=f"File .pkl không hợp lệ: {e}")

    # Lưu metadata vào DB
    record = MLModel(
        name=name,
        filename=file.filename,
        algorithm=algorithm,
        description=description or None,
        is_active=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return MLModelUploadResponse(
        message=f"Upload '{name}' thành công. Dùng POST /models/{record.id}/activate để kích hoạt.",
        model=record,
    )


@router.post("/{model_id}/activate", response_model=MLModelActivateResponse, summary="Kích hoạt một model")
def activate_model(model_id: int, db: Session = Depends(get_db)):
    """
    Kích hoạt model theo id.  
    Model đang active trước đó sẽ bị deactivate tự động.
    """
    target = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy model.")

    # Deactivate tất cả
    db.query(MLModel).update({"is_active": False})
    # Activate target
    target.is_active = True
    db.commit()
    db.refresh(target)

    # Load vào cache
    try:
        ml_service.set_active_model(target.id, target.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không load được model: {e}")

    return MLModelActivateResponse(
        message=f"Đã kích hoạt model '{target.name}'. Tất cả dự đoán tiếp theo sẽ dùng model này.",
        activated_model=target,
    )


@router.delete("/{model_id}", summary="Xoá model")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    """Xoá model khỏi DB và disk. Không thể xoá model đang active."""
    record = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy model.")
    if record.is_active:
        raise HTTPException(status_code=400, detail="Không thể xoá model đang active. Hãy activate model khác trước.")

    # Xoá file trên disk
    path = os.path.join(settings.MODEL_DIR, record.filename)
    if os.path.exists(path):
        os.remove(path)

    ml_service.evict_model(record.id)
    db.delete(record)
    db.commit()

    return {"message": f"Đã xoá model '{record.name}'."}
