from datetime import date
from typing import Literal

from pydantic import BaseModel


class TransactionItem(BaseModel):
    type: Literal["income", "expense"]
    title: str
    amount: float
    date: date


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    remaining_amount: float
    recent_transactions: list[TransactionItem]