"""
Model Manager — tải, lưu và phục vụ các mô hình ML đã huấn luyện (.pkl).
Hỗ trợ bundle: {"model": ..., "scaler_amount": ..., "scaler_time": ...}
"""
import os
import time
import logging
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Thứ tự feature đúng theo notebook: V1-V28, scaled_amount, scaled_time
FEATURE_COLUMNS = [f"V{i}" for i in range(1, 29)] + ["scaled_amount", "scaled_time"]


class ModelManager:
    def __init__(self):
        self._model         = None
        self._scaler        = None   # scaler chung (định dạng cũ)
        self._scaler_amount = None   # scaler riêng cho Amount
        self._scaler_time   = None   # scaler riêng cho Time
        self._model_meta    = None
        self._models_dir    = Path(os.getenv("MODELS_DIR", "ml_models"))

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def active_model_name(self) -> Optional[str]:
        return self._model_meta.name if self._model_meta else None

    def _load_bundle(self, loaded, model_record):
        """Phân tích bundle và gán đúng scaler."""
        if isinstance(loaded, dict):
            self._model = loaded["model"]
            if "scaler_amount" in loaded:
                self._scaler_amount = loaded["scaler_amount"]
                self._scaler_time   = loaded.get("scaler_time")
                self._scaler        = None
                logger.info("Bundle: model + scaler_amount + scaler_time")
            elif "scaler" in loaded:
                self._scaler        = loaded["scaler"]
                self._scaler_amount = None
                self._scaler_time   = None
                logger.info("Bundle: model + scaler")
            else:
                self._scaler = self._scaler_amount = self._scaler_time = None
                logger.info("Bundle: model only")
        else:
            self._model         = loaded
            self._scaler        = None
            self._scaler_amount = None
            self._scaler_time   = None
            logger.info("Bundle: model only (raw)")
        self._model_meta = model_record

    async def load_active_model(self):
        try:
            import joblib
            from app.db.database import AsyncSessionLocal
            from app.models.orm import MLModel
            from sqlalchemy import select

            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(MLModel).where(MLModel.is_active == True).limit(1)
                )
                model_record = result.scalar_one_or_none()

            if model_record is None:
                logger.warning("Không có model nào đang active trong DB.")
                return

            model_path = self._models_dir / model_record.file_path
            if not model_path.exists():
                logger.error(f"Không tìm thấy file model: {model_path}")
                return

            loaded = joblib.load(model_path)
            self._load_bundle(loaded, model_record)
            logger.info(f"Đã tải model: {model_record.name} ({model_record.algorithm})")

        except Exception as e:
            logger.exception(f"Lỗi khi tải model: {e}")

    def load_from_path(self, file_path: str, model_record):
        import joblib
        loaded = joblib.load(file_path)
        self._load_bundle(loaded, model_record)

    def unload(self):
        self._model = self._scaler = self._scaler_amount = self._scaler_time = None
        self._model_meta = None

    def _prepare_features(self, transaction_data: dict) -> np.ndarray:
        """Chuyển dict giao dịch → array [V1..V28, scaled_amount, scaled_time]."""
        # V1-V28
        v_values = [
            float(transaction_data.get(f"v{i}") or transaction_data.get(f"V{i}") or 0.0)
            for i in range(1, 29)
        ]

        amount = float(transaction_data.get("amount") or transaction_data.get("Amount") or 0.0)
        time_s = float(transaction_data.get("time_seconds") or transaction_data.get("Time") or 0.0)

        # ✅ Scale amount & time dùng DataFrame có tên cột — tránh UserWarning
        if self._scaler_amount is not None:
            scaled_amount = float(
                self._scaler_amount.transform(pd.DataFrame([[amount]], columns=["Amount"]))[0][0]
            )
        else:
            scaled_amount = amount

        if self._scaler_time is not None:
            scaled_time = float(
                self._scaler_time.transform(pd.DataFrame([[time_s]], columns=["Time"]))[0][0]
            )
        else:
            scaled_time = time_s

        # ✅ Tạo DataFrame với đúng tên cột để predict không bị warning
        X = pd.DataFrame([v_values + [scaled_amount, scaled_time]], columns=FEATURE_COLUMNS)

        # Nếu có scaler chung (định dạng cũ) — transform trả về array, OK
        if self._scaler is not None:
            X = self._scaler.transform(X)

        return X

    def predict(self, transaction_data: dict, threshold: Optional[float] = None) -> dict:
        if not self.is_loaded:
            raise RuntimeError("Chưa có model nào được tải.")

        from app.core.config import settings, get_risk_level
        threshold = threshold or float(self._model_meta.threshold or settings.DEFAULT_THRESHOLD)

        start = time.perf_counter()
        X     = self._prepare_features(transaction_data)
        algo  = self._model_meta.algorithm

        # THÊM TẠM 2 DÒNG NÀY ĐỂ DEBUG
        import logging
        logging.getLogger(__name__).warning(f"DEBUG X values: {X.values}")

        if algo == "IsolationForest":
            raw_score  = self._model.decision_function(X)[0]
            fraud_prob = float(1 / (1 + np.exp(raw_score * 5)))
        else:
            fraud_prob = float(self._model.predict_proba(X)[0][1])

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        feature_importance = None
        if hasattr(self._model, "feature_importances_"):
            imp     = self._model.feature_importances_
            top_idx = np.argsort(imp)[::-1][:10]
            feature_importance = {
                FEATURE_COLUMNS[i]: round(float(imp[i]), 6)
                for i in top_idx if i < len(FEATURE_COLUMNS)
            }

        return {
            "fraud_probability":  round(fraud_prob, 6),
            "is_fraud":           bool(fraud_prob >= threshold),
            "threshold_used":     threshold,
            "risk_level":         get_risk_level(fraud_prob),
            "feature_importance": feature_importance,
            "processing_time_ms": elapsed_ms,
        }

    def predict_batch(self, transactions: list, threshold: Optional[float] = None) -> list:
        if not self.is_loaded:
            raise RuntimeError("Chưa có model nào được tải.")

        from app.core.config import settings, get_risk_level
        threshold = threshold or float(self._model_meta.threshold or settings.DEFAULT_THRESHOLD)

        start    = time.perf_counter()

        v_matrix = np.array([
            [float(t.get(f"v{i}") or t.get(f"V{i}") or 0.0) for i in range(1, 29)]
            for t in transactions
        ])
        raw_amounts = [float(t.get("amount") or t.get("Amount") or 0.0) for t in transactions]
        raw_times   = [float(t.get("time_seconds") or t.get("Time") or 0.0) for t in transactions]

        # ✅ Scale dùng DataFrame có tên cột
        if self._scaler_amount is not None:
            scaled_amounts = self._scaler_amount.transform(
                pd.DataFrame(raw_amounts, columns=["Amount"])
            )
        else:
            scaled_amounts = np.array(raw_amounts).reshape(-1, 1)

        if self._scaler_time is not None:
            scaled_times = self._scaler_time.transform(
                pd.DataFrame(raw_times, columns=["Time"])
            )
        else:
            scaled_times = np.array(raw_times).reshape(-1, 1)

        # ✅ Tạo DataFrame với đúng tên cột cho predict
        X_arr = np.hstack([v_matrix, scaled_amounts, scaled_times])
        X = pd.DataFrame(X_arr, columns=FEATURE_COLUMNS)

        if self._scaler is not None:
            X = self._scaler.transform(X)

        algo = self._model_meta.algorithm
        if algo == "IsolationForest":
            fraud_probs = 1 / (1 + np.exp(self._model.decision_function(X) * 5))
        else:
            fraud_probs = self._model.predict_proba(X)[:, 1]

        per_ms = max(1, int((time.perf_counter() - start) * 1000) // len(transactions))

        return [
            {
                "fraud_probability":  round(float(p), 6),
                "is_fraud":           bool(float(p) >= threshold),
                "threshold_used":     threshold,
                "risk_level":         get_risk_level(float(p)),
                "feature_importance": None,
                "processing_time_ms": per_ms,
            }
            for p in fraud_probs
        ]


model_manager = ModelManager()