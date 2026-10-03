from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user

from ..models.user import User
from ..models.notification import Notification
from ..models.budget import Budget
from ..models.expense import Expense
from ..models.savings import Savings

from ..schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =========================================================
# GET MY NOTIFICATIONS
# =========================================================

@router.get(
    "",
    response_model=list[NotificationResponse]
)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    return (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )


# =========================================================
# CREATE NOTIFICATION
# =========================================================

@router.post(
    "",
    response_model=NotificationResponse
)
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    notification = Notification(
        user_id=current_user.id,
        type=notification_data.type or "info",
        title=notification_data.title,
        message=notification_data.message,
        is_read=False,
        link=notification_data.link,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


# =========================================================
# MARK NOTIFICATION AS READ
# =========================================================

@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: int,
    notification_data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    if notification_data.is_read is not None:
        notification.is_read = notification_data.is_read

    db.commit()
    db.refresh(notification)

    return notification


# =========================================================
# DELETE NOTIFICATION
# =========================================================

@router.delete(
    "/{notification_id}"
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted successfully"
    }


# =========================================================
# HELPER — CHECK DUPLICATE NOTIFICATION
# =========================================================

def notification_exists(
    db: Session,
    user_id: int,
    notification_type: str,
    link: str | None = None,
    title: str | None = None,
):

    query = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == notification_type,
        )
    )

    if link is not None:
        query = query.filter(
            Notification.link == link
        )

    if title is not None:
        query = query.filter(
            Notification.title == title
        )

    return query.first() is not None


# =========================================================
# FINANCIAL ALERT CHECK
#
# Checks:
#
# 1. Budget limit alert
# 2. Savings reminder
# 3. Savings milestone
# 4. Monthly report notification
# =========================================================

@router.post(
    "/check-alerts"
)
def check_financial_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    created_notifications = []

    today = date.today()

    # =====================================================
    # CURRENT MONTH
    # =====================================================

    current_month = today.month
    current_year = today.year

    # =====================================================
    # 1. BUDGET LIMIT ALERT
    # =====================================================

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == current_month,
            Budget.year == current_year,
        )
        .all()
    )

    for budget in budgets:

        expense_query = (
            db.query(
                func.coalesce(
                    func.sum(Expense.amount),
                    0
                )
            )
            .filter(
                Expense.user_id == current_user.id,
                func.extract(
                    "month",
                    Expense.expense_date
                ) == current_month,
                func.extract(
                    "year",
                    Expense.expense_date
                ) == current_year,
            )
        )

        if budget.category:

            expense_query = expense_query.filter(
                Expense.category == budget.category
            )

        spent = float(
            expense_query.scalar() or 0
        )

        planned = float(
            budget.planned_amount or 0
        )

        if planned <= 0:
            continue

        utilization = (
            spent / planned
        ) * 100

        # Alert at 80% or above
        if utilization >= 80:

            category_name = (
                budget.category
                if budget.category
                else "overall"
            )

            title = "Budget Alert"

            link = f"/budget/{budget.id}"

            if not notification_exists(
                db,
                current_user.id,
                "budget",
                link=link,
            ):

                notification = Notification(
                    user_id=current_user.id,
                    type="budget",
                    title=title,
                    message=(
                        f"Your {category_name} budget has reached "
                        f"{utilization:.0f}% of its limit."
                    ),
                    is_read=False,
                    link=link,
                )

                db.add(notification)

                created_notifications.append(
                    "Budget limit alert"
                )

    # =====================================================
    # 2. GET ALL SAVINGS GOALS
    #
    # IMPORTANT:
    # We keep ALL goals here.
    #
    # This includes completed goals because a completed goal
    # must still be checked for the 100% milestone.
    # =====================================================

    all_savings_goals = (
        db.query(Savings)
        .filter(
            Savings.user_id == current_user.id
        )
        .all()
    )

    # =====================================================
    # ACTIVE SAVINGS GOALS FOR REMINDERS
    # =====================================================

    active_savings_goals = (
        db.query(Savings)
        .filter(
            Savings.user_id == current_user.id,
            Savings.status != "completed",
            Savings.target_date.isnot(None),
        )
        .all()
    )

    # =====================================================
    # 3. SAVINGS REMINDER
    #
    # Reminder when target date is within 7 days.
    # =====================================================

    for goal in active_savings_goals:

        days_remaining = (
            goal.target_date - today
        ).days

        if 0 <= days_remaining <= 7:

            link = f"/savings/{goal.id}"

            if not notification_exists(
                db,
                current_user.id,
                "savings",
                link=link,
            ):

                if days_remaining == 0:

                    date_message = (
                        "The target date is today."
                    )

                elif days_remaining == 1:

                    date_message = (
                        "Only 1 day remains."
                    )

                else:

                    date_message = (
                        f"Only {days_remaining} days remain."
                    )

                notification = Notification(
                    user_id=current_user.id,
                    type="savings",
                    title="Savings Reminder",
                    message=(
                        f"Your savings goal '{goal.name}' "
                        f"is approaching its target date. "
                        f"{date_message}"
                    ),
                    is_read=False,
                    link="/savings",
                )

                db.add(notification)

                created_notifications.append(
                    "Savings reminder"
                )

    # =====================================================
    # 4. SAVINGS GOAL MILESTONE
    #
    # Milestones:
    #
    # 25%
    # 50%
    # 75%
    # 100%
    #
    # IMPORTANT FIX:
    # Use all_savings_goals rather than active_savings_goals.
    #
    # This allows a completed goal to generate the 100%
    # notification.
    # =====================================================

    milestones = [
        25,
        50,
        75,
        100
    ]

    for goal in all_savings_goals:

        target = float(
            goal.target_amount or 0
        )

        current = float(
            goal.current_amount or 0
        )

        if target <= 0:
            continue

        progress = (
            current / target
        ) * 100

        for milestone in milestones:

            if progress >= milestone:

                link = (
                    f"/savings/{goal.id}/milestone/{milestone}"
                )

                # Prevent duplicate milestone notification
                if notification_exists(
                    db,
                    current_user.id,
                    "milestone",
                    link=link,
                ):

                    continue

                # -------------------------------------------------
                # 100% COMPLETION
                # -------------------------------------------------

                if milestone == 100:

                    title = (
                        "Savings Goal Completed"
                    )

                    message = (
                        f"Congratulations! You have reached "
                        f"your '{goal.name}' savings goal."
                    )

                # -------------------------------------------------
                # 25 / 50 / 75% MILESTONE
                # -------------------------------------------------

                else:

                    title = (
                        "Savings Goal Milestone"
                    )

                    message = (
                        f"Great progress! Your '{goal.name}' "
                        f"savings goal has reached "
                        f"{milestone}%."
                    )

                notification = Notification(
                    user_id=current_user.id,
                    type="milestone",
                    title=title,
                    message=message,
                    is_read=False,
                    link="/savings",
                )

                db.add(notification)

                created_notifications.append(
                    f"{milestone}% savings milestone"
                )

    # =====================================================
    # 5. MONTHLY REPORT NOTIFICATION
    #
    # One report notification per month.
    # =====================================================

    month_title = (
        f"Monthly Report Available - "
        f"{today.strftime('%B %Y')}"
    )

    existing_report_notification = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.type == "report",
            Notification.title == month_title,
        )
        .first()
    )

    if not existing_report_notification:

        notification = Notification(
            user_id=current_user.id,
            type="report",
            title=month_title,
            message=(
                f"Your monthly financial report for "
                f"{today.strftime('%B %Y')} is now available."
            ),
            is_read=False,
            link="/analytics",
        )

        db.add(notification)

        created_notifications.append(
            "Monthly report notification"
        )

    # =====================================================
    # SAVE ALL NOTIFICATIONS
    # =====================================================

    db.commit()

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "message": "Financial alerts checked successfully",
        "notifications_created": created_notifications,
        "count": len(created_notifications),
    }