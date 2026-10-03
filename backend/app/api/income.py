from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models.user import User
from ..models.income import Income
from ..schemas.income import (
    IncomeCreate,
    IncomeUpdate,
    IncomeResponse
)


router = APIRouter(
    prefix="/income",
    tags=["Income"]
)


@router.post(
    "",
    response_model=IncomeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_income(
    income_data: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = Income(
        user_id=current_user.id,
        source=income_data.source,
        amount=income_data.amount,
        income_date=income_data.income_date,
        description=income_data.description
    )

    db.add(income)
    db.commit()
    db.refresh(income)

    return income


@router.get(
    "",
    response_model=list[IncomeResponse]
)
def get_my_income(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incomes = (
        db.query(Income)
        .filter(Income.user_id == current_user.id)
        .order_by(
            Income.income_date.desc(),
            Income.id.desc()
        )
        .all()
    )

    return incomes


@router.get(
    "/{income_id}",
    response_model=IncomeResponse
)
def get_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = (
        db.query(Income)
        .filter(
            Income.id == income_id,
            Income.user_id == current_user.id
        )
        .first()
    )

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )

    return income


@router.put(
    "/{income_id}",
    response_model=IncomeResponse
)
def update_income(
    income_id: int,
    income_data: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = (
        db.query(Income)
        .filter(
            Income.id == income_id,
            Income.user_id == current_user.id
        )
        .first()
    )

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )

    update_data = income_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(income, field, value)

    db.commit()
    db.refresh(income)

    return income


@router.delete(
    "/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = (
        db.query(Income)
        .filter(
            Income.id == income_id,
            Income.user_id == current_user.id
        )
        .first()
    )

    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )

    db.delete(income)
    db.commit()

    return None