from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, Boolean, String,
    DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class MLModel(Base):
    """Bảng quản lý các model ML đã upload. Chỉ 1 model được is_active=True."""
    __tablename__ = "ml_models"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(100), nullable=False)
    filename     = Column(String(200), nullable=False, unique=True)
    algorithm    = Column(String(50),  nullable=False)
    description  = Column(Text, nullable=True)
    is_active    = Column(Boolean, default=False, nullable=False)
    uploaded_at  = Column(DateTime, default=datetime.utcnow)

    predictions  = relationship("Prediction", back_populates="ml_model")


class Transaction(Base):
    """Bảng lưu các giao dịch được submit để kiểm tra."""
    __tablename__ = "transactions"

    id            = Column(Integer, primary_key=True, index=True)
    time_seconds  = Column(Float, nullable=False)
    amount        = Column(Float, nullable=False)
    v1  = Column(Float); v2  = Column(Float); v3  = Column(Float)
    v4  = Column(Float); v5  = Column(Float); v6  = Column(Float)
    v7  = Column(Float); v8  = Column(Float); v9  = Column(Float)
    v10 = Column(Float); v11 = Column(Float); v12 = Column(Float)
    v13 = Column(Float); v14 = Column(Float); v15 = Column(Float)
    v16 = Column(Float); v17 = Column(Float); v18 = Column(Float)
    v19 = Column(Float); v20 = Column(Float); v21 = Column(Float)
    v22 = Column(Float); v23 = Column(Float); v24 = Column(Float)
    v25 = Column(Float); v26 = Column(Float); v27 = Column(Float)
    v28 = Column(Float)
    actual_class  = Column(Integer, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    source        = Column(String(50), default="api")
    note          = Column(Text, nullable=True)

    prediction = relationship("Prediction", back_populates="transaction", uselist=False)


class Prediction(Base):
    """Bảng lưu kết quả dự đoán của mô hình cho mỗi giao dịch."""
    __tablename__ = "predictions"

    id                 = Column(Integer, primary_key=True, index=True)
    transaction_id     = Column(Integer, ForeignKey("transactions.id"), unique=True, index=True)
    ml_model_id        = Column(Integer, ForeignKey("ml_models.id"), nullable=True, index=True)
    fraud_probability  = Column(Float, nullable=False)
    is_fraud           = Column(Boolean, nullable=False)
    risk_level         = Column(String(10), nullable=False)
    model_version      = Column(String(100), nullable=True)
    predicted_at       = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="prediction")
    ml_model    = relationship("MLModel", back_populates="predictions")
