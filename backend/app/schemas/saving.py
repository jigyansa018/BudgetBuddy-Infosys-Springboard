from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# Savings Goal Create Schema
# =========================================================

class SavingsGoalCreate(BaseModel):

    goal_name: str = Field(
        min_length=1,
        max_length=150
    )

    target_amount: float = Field(
        gt=0
    )

    saved_amount: float = Field(
        default=0,
        ge=0
    )

    target_date: Optional[date] = None

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


# =========================================================
# Savings Goal Update Schema
# =========================================================

class SavingsGoalUpdate(BaseModel):

    goal_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150
    )

    target_amount: Optional[float] = Field(
        default=None,
        gt=0
    )

    saved_amount: Optional[float] = Field(
        default=None,
        ge=0
    )

    target_date: Optional[date] = None

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


# =========================================================
# Savings Goal Response Schema
# =========================================================

class SavingsGoalResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    goal_name: str
    target_amount: float
    saved_amount: float
    target_date: Optional[date]
    description: Optional[str]