from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MLModelOut(BaseModel):
    """Response schema cho một model."""
    id:          int
    name:        str
    filename:    str
    algorithm:   str
    description: Optional[str]
    is_active:   bool
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class MLModelActivateResponse(BaseModel):
    message:          str
    activated_model:  MLModelOut


class MLModelUploadResponse(BaseModel):
    message: str
    model:   MLModelOut
