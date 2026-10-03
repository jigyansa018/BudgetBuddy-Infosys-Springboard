from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


BudgetCategory = Literal[
    "Food",
    "Travel",
    "Shopping",
    "Education",
    "Entertainment",
    "Miscellaneous"
]


class BudgetCreate(BaseModel):
    category: BudgetCategory
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2020, le=2100)
    planned_amount: float = Field(ge=0)


class BudgetUpdate(BaseModel):
    category: Optional[BudgetCategory] = None
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2020, le=2100)
    planned_amount: Optional[float] = Field(default=None, ge=0)


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: str
    month: int
    year: int
    planned_amount: float