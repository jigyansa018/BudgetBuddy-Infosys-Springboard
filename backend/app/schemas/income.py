from datetime import date
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


IncomeSource = Literal[
    "Pocket Money",
    "Scholarship",
    "Freelance Income"
]


class IncomeCreate(BaseModel):
    source: IncomeSource
    amount: float = Field(gt=0)
    income_date: date
    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


class IncomeUpdate(BaseModel):
    source: Optional[IncomeSource] = None
    amount: Optional[float] = Field(
        default=None,
        gt=0
    )
    income_date: Optional[date] = None
    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


class IncomeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    source: str
    amount: float
    income_date: date
    description: Optional[str]