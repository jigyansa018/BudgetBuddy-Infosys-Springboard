from datetime import date
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


ExpenseCategory = Literal[
    "Food",
    "Travel",
    "Shopping",
    "Education",
    "Entertainment",
    "Miscellaneous"
]


class ExpenseCreate(BaseModel):

    category: ExpenseCategory

    title: str = Field(
        min_length=1,
        max_length=150
    )

    amount: float = Field(
        gt=0
    )

    expense_date: date

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


class ExpenseUpdate(BaseModel):

    category: Optional[ExpenseCategory] = None

    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150
    )

    amount: Optional[float] = Field(
        default=None,
        gt=0
    )

    expense_date: Optional[date] = None

    description: Optional[str] = Field(
        default=None,
        max_length=255
    )


class ExpenseResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    category: str
    title: str
    amount: float
    expense_date: date
    description: Optional[str]