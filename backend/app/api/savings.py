from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models.savings import Savings
from ..models.user import User

from ..schemas.schemas import (
    SavingsCreate,
    SavingsUpdate,
    SavingsResponse,
)


# =========================================================
# Contribution Schema
# =========================================================

class SavingsContribution(BaseModel):
    amount: float


# =========================================================
# Router
# =========================================================

router = APIRouter(
    prefix="/savings",
    tags=["Savings"]
)


# =========================================================
# GET ALL SAVINGS FOR CURRENT USER
# =========================================================

@router.get(
    "",
    response_model=list[SavingsResponse]
)
def get_my_savings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    savings = (
        db.query(Savings)
        .filter(
            Savings.user_id == current_user.id
        )
        .order_by(Savings.id.desc())
        .all()
    )

    return savings


# =========================================================
# CREATE SAVINGS GOAL
# =========================================================

@router.post(
    "",
    response_model=SavingsResponse,
    status_code=status.HTTP_201_CREATED
)
def create_savings(
    savings_data: SavingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Basic validation
    if savings_data.target_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target amount must be greater than 0"
        )

    if savings_data.current_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current amount cannot be negative"
        )

    if savings_data.current_amount > savings_data.target_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current amount cannot exceed target amount"
        )

    # Determine initial status
    initial_status = (
        "completed"
        if savings_data.current_amount >= savings_data.target_amount
        else "active"
    )

    new_savings = Savings(
        user_id=current_user.id,
        name=savings_data.name,
        target_amount=savings_data.target_amount,
        current_amount=savings_data.current_amount,
        target_date=savings_data.target_date,
        description=savings_data.description,
        status=initial_status,
    )

    db.add(new_savings)
    db.commit()
    db.refresh(new_savings)

    return new_savings


# =========================================================
# GET ONE SAVINGS GOAL
# =========================================================

@router.get(
    "/{savings_id}",
    response_model=SavingsResponse
)
def get_savings(
    savings_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    savings = (
        db.query(Savings)
        .filter(
            Savings.id == savings_id,
            Savings.user_id == current_user.id
        )
        .first()
    )

    if not savings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings not found"
        )

    return savings


# =========================================================
# UPDATE SAVINGS GOAL
# =========================================================

@router.put(
    "/{savings_id}",
    response_model=SavingsResponse
)
def update_savings(
    savings_id: int,
    savings_data: SavingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    savings = (
        db.query(Savings)
        .filter(
            Savings.id == savings_id,
            Savings.user_id == current_user.id
        )
        .first()
    )

    if not savings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings not found"
        )

    update_data = savings_data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # Validate target amount if provided
    # -----------------------------------------------------

    if "target_amount" in update_data:

        if update_data["target_amount"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target amount must be greater than 0"
            )

    # -----------------------------------------------------
    # Validate current amount if provided
    # -----------------------------------------------------

    if "current_amount" in update_data:

        if update_data["current_amount"] < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current amount cannot be negative"
            )

    # -----------------------------------------------------
    # Determine final values after update
    # -----------------------------------------------------

    final_target = update_data.get(
        "target_amount",
        savings.target_amount
    )

    final_current = update_data.get(
        "current_amount",
        savings.current_amount
    )

    if final_current > final_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current amount cannot exceed target amount"
        )

    # -----------------------------------------------------
    # Apply updates
    # -----------------------------------------------------

    for field, value in update_data.items():
        setattr(savings, field, value)

    # Automatically maintain status
    if final_current >= final_target:
        savings.status = "completed"
    else:
        savings.status = "active"

    db.commit()
    db.refresh(savings)

    return savings


# =========================================================
# ADD SAVINGS CONTRIBUTION
# =========================================================

@router.post(
    "/{savings_id}/contribute",
    response_model=SavingsResponse
)
def add_savings_contribution(
    savings_id: int,
    contribution: SavingsContribution,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # -----------------------------------------------------
    # Find only the current user's goal
    # -----------------------------------------------------

    savings = (
        db.query(Savings)
        .filter(
            Savings.id == savings_id,
            Savings.user_id == current_user.id
        )
        .first()
    )

    if not savings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings not found"
        )

    # -----------------------------------------------------
    # Validate contribution
    # -----------------------------------------------------

    if contribution.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contribution amount must be greater than 0"
        )

    # -----------------------------------------------------
    # Do not add money to an already completed goal
    # -----------------------------------------------------

    if savings.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Savings goal is already completed"
        )

    # -----------------------------------------------------
    # Add contribution
    # -----------------------------------------------------

    savings.current_amount += contribution.amount

    # -----------------------------------------------------
    # Prevent amount from exceeding target
    # -----------------------------------------------------

    if savings.current_amount >= savings.target_amount:

        savings.current_amount = savings.target_amount
        savings.status = "completed"

    else:

        savings.status = "active"

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    db.commit()
    db.refresh(savings)

    return savings


# =========================================================
# DELETE SAVINGS GOAL
# =========================================================

@router.delete(
    "/{savings_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_savings(
    savings_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    savings = (
        db.query(Savings)
        .filter(
            Savings.id == savings_id,
            Savings.user_id == current_user.id
        )
        .first()
    )

    if not savings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings not found"
        )

    db.delete(savings)
    db.commit()

    return None