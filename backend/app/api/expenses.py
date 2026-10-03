from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.expense import Expense
from ..schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse
)


router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"]
)


# =========================================================
# CREATE EXPENSE
# =========================================================

@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED
)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    expense = Expense(
        user_id=current_user.id,
        category=expense_data.category,
        title=expense_data.title,
        amount=expense_data.amount,
        expense_date=expense_data.expense_date,
        description=expense_data.description
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    return expense


# =========================================================
# GET MY EXPENSES
# =========================================================

@router.get(
    "",
    response_model=list[ExpenseResponse]
)
def get_my_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == current_user.id)
        .order_by(
            Expense.expense_date.desc(),
            Expense.id.desc()
        )
        .all()
    )

    return expenses


# =========================================================
# GET ONE EXPENSE
# =========================================================

@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse
)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    expense = (
        db.query(Expense)
        .filter(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .first()
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    return expense


# =========================================================
# UPDATE EXPENSE
# =========================================================

@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse
)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    expense = (
        db.query(Expense)
        .filter(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .first()
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    update_data = expense_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    return expense


# =========================================================
# DELETE EXPENSE
# =========================================================

@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    expense = (
        db.query(Expense)
        .filter(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .first()
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    db.delete(expense)
    db.commit()

    return None