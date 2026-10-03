from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.income import Income
from ..models.expense import Expense
from ..models.savings import Savings
from ..models.budget import Budget


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


# =========================================================
# 1. FINANCIAL SUMMARY
# =========================================================
@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(
            Income.user_id == current_user.id
        )
        .scalar()
    )

    total_expenses = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == current_user.id
        )
        .scalar()
    )

    total_saved = (
        db.query(func.coalesce(func.sum(Savings.current_amount), 0))
        .filter(
            Savings.user_id == current_user.id
        )
        .scalar()
    )

    total_income = float(total_income or 0)
    total_expenses = float(total_expenses or 0)
    total_saved = float(total_saved or 0)

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "remaining_balance": total_income - total_expenses,
        "total_saved": total_saved
    }


# =========================================================
# 2. EXPENSES BY CATEGORY
# =========================================================
@router.get("/expenses-by-category")
def expenses_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Expense.category,
            func.sum(Expense.amount).label("total")
        )
        .filter(
            Expense.user_id == current_user.id
        )
        .group_by(
            Expense.category
        )
        .all()
    )

    return [
        {
            "category": category,
            "total": float(total or 0)
        }
        for category, total in results
    ]


# =========================================================
# 3. MONTHLY TRENDS
# =========================================================

from fastapi import Query
from fastapi import HTTPException


@router.get("/monthly-trends")
def monthly_trends(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # -----------------------------------------------------
    # Month and year must be supplied together
    # -----------------------------------------------------
    if (month is None and year is not None) or (
        month is not None and year is None
    ):
        raise HTTPException(
            status_code=400,
            detail="Month and year must be provided together"
        )

    # -----------------------------------------------------
    # If month/year filter is provided
    # -----------------------------------------------------
    if month is not None and year is not None:

        income_query = db.query(
            func.coalesce(func.sum(Income.amount), 0)
        ).filter(
            Income.user_id == current_user.id,
            func.strftime("%m", Income.income_date) == f"{month:02d}",
            func.strftime("%Y", Income.income_date) == str(year)
        )

        expense_query = db.query(
            func.coalesce(func.sum(Expense.amount), 0)
        ).filter(
            Expense.user_id == current_user.id,
            func.strftime("%m", Expense.expense_date) == f"{month:02d}",
            func.strftime("%Y", Expense.expense_date) == str(year)
        )

        total_income = float(income_query.scalar() or 0)
        total_expenses = float(expense_query.scalar() or 0)

        return [
            {
                "month": f"{year:04d}-{month:02d}",
                "income": total_income,
                "expenses": total_expenses,
                "balance": total_income - total_expenses
            }
        ]

    # -----------------------------------------------------
    # No filter → return all available monthly trends
    # -----------------------------------------------------
    income_results = (
        db.query(
            func.strftime("%Y-%m", Income.income_date).label("month"),
            func.sum(Income.amount).label("total_income")
        )
        .filter(
            Income.user_id == current_user.id
        )
        .group_by(
            func.strftime("%Y-%m", Income.income_date)
        )
        .all()
    )

    expense_results = (
        db.query(
            func.strftime("%Y-%m", Expense.expense_date).label("month"),
            func.sum(Expense.amount).label("total_expenses")
        )
        .filter(
            Expense.user_id == current_user.id
        )
        .group_by(
            func.strftime("%Y-%m", Expense.expense_date)
        )
        .all()
    )

    income_by_month = {
        month_name: float(total or 0)
        for month_name, total in income_results
        if month_name
    }

    expense_by_month = {
        month_name: float(total or 0)
        for month_name, total in expense_results
        if month_name
    }

    months = sorted(
        set(income_by_month.keys()) |
        set(expense_by_month.keys())
    )

    return [
        {
            "month": month_name,
            "income": income_by_month.get(month_name, 0),
            "expenses": expense_by_month.get(month_name, 0),
            "balance": (
                income_by_month.get(month_name, 0)
                - expense_by_month.get(month_name, 0)
            )
        }
        for month_name in months
    ]

# =========================================================
# 4. SAVINGS GOAL PROGRESS
# =========================================================
@router.get("/savings-progress")
def savings_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = (
        db.query(Savings)
        .filter(
            Savings.user_id == current_user.id
        )
        .order_by(
            Savings.id.desc()
        )
        .all()
    )

    result = []

    for goal in goals:

        percentage = 0

        if goal.target_amount > 0:
            percentage = (
                float(goal.current_amount)
                /
                float(goal.target_amount)
            ) * 100

        percentage = min(
            percentage,
            100
        )

        result.append({
            "id": goal.id,
            "name": goal.name,
            "target_amount": float(
                goal.target_amount
            ),
            "current_amount": float(
                goal.current_amount
            ),
            "remaining_amount": max(
                float(goal.target_amount)
                -
                float(goal.current_amount),
                0
            ),
            "progress_percentage": round(
                percentage,
                2
            ),
            "status": goal.status
        })

    return result


# =========================================================
# 5. BUDGET UTILIZATION
# =========================================================
@router.get("/budget-utilization")
def budget_utilization(
    month: int = Query(
        ...,
        ge=1,
        le=12,
        description="Month number from 1 to 12"
    ),
    year: int = Query(
        ...,
        ge=1900,
        le=2100,
        description="Year between 1900 and 2100"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year
        )
        .all()
    )

    result = []

    for budget in budgets:

        query = db.query(
            func.coalesce(
                func.sum(Expense.amount),
                0
            )
        ).filter(
            Expense.user_id == current_user.id,
            func.strftime(
                "%m",
                Expense.expense_date
            ) == f"{month:02d}",
            func.strftime(
                "%Y",
                Expense.expense_date
            ) == str(year)
        )

        if budget.category:
            query = query.filter(
                Expense.category == budget.category
            )

        spent = float(
            query.scalar() or 0
        )

        planned = float(
            budget.planned_amount or 0
        )

        percentage = 0

        if planned > 0:
            percentage = (
                spent / planned
            ) * 100

        result.append({
            "budget_id": budget.id,
            "category": budget.category,
            "month": month,
            "year": year,
            "planned_amount": planned,
            "spent_amount": spent,
            "remaining_amount": max(
                planned - spent,
                0
            ),
            "utilization_percentage": round(
                percentage,
                2
            ),
            "status": (
                "overspent"
                if spent > planned
                else "warning"
                if percentage >= 80
                else "safe"
            )
        })

    return result