from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# Savings Create Schema
# =========================================================

class SavingsCreate(BaseModel):

    name: str = Field(
        min_length=1,
        max_length=150
    )

    target_amount: float = Field(
        gt=0
    )

    current_amount: float = Field(
        default=0,
        ge=0
    )

    target_date: Optional[date] = None

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


# =========================================================
# Savings Update Schema
# =========================================================

class SavingsUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150
    )

    target_amount: Optional[float] = Field(
        default=None,
        gt=0
    )

    current_amount: Optional[float] = Field(
        default=None,
        ge=0
    )

    target_date: Optional[date] = None

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


# =========================================================
# Savings Response Schema
# =========================================================

class SavingsResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[date]
    description: Optional[str]