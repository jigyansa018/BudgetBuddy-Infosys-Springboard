from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.income import Income
from ..models.expense import Expense
from ..schemas.dashboard import DashboardSummary


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get(
    "/summary",
    response_model=DashboardSummary
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incomes = (
        db.query(Income)
        .filter(Income.user_id == current_user.id)
        .all()
    )

    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == current_user.id)
        .all()
    )

    total_income = sum(income.amount for income in incomes)
    total_expenses = sum(expense.amount for expense in expenses)

    remaining_amount = total_income - total_expenses

    transactions = []

    for income in incomes:
        transactions.append({
            "type": "income",
            "title": income.source,
            "amount": income.amount,
            "date": income.income_date
        })

    for expense in expenses:
        transactions.append({
            "type": "expense",
            "title": expense.title,
            "amount": expense.amount,
            "date": expense.expense_date
        })

    transactions.sort(
        key=lambda x: x["date"],
        reverse=True
    )

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "remaining_amount": remaining_amount,
        "recent_transactions": transactions[:10]
    }