from datetime import date

from app.database import SessionLocal
from app.models import (
    User,
    Profile,
    Income,
    Expense,
    Budget,
    SavingsGoal,
    Notification,
)


db = SessionLocal()

try:
    user = User(
        full_name="Jigyansa Mohanty",
        email="student@example.com",
        password_hash="development-only-password"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(
        user_id=user.id,
        phone="9876543210",
        currency="INR",
        financial_preference="Monthly budgeting"
    )

    income1 = Income(
        user_id=user.id,
        source="Pocket Money",
        amount=8000,
        income_date=date(2026, 8, 1),
        description="Monthly pocket money"
    )

    income2 = Income(
        user_id=user.id,
        source="Scholarship",
        amount=5000,
        income_date=date(2026, 8, 5),
        description="Monthly scholarship"
    )

    expense1 = Expense(
        user_id=user.id,
        category="Food",
        title="Monthly food expenses",
        amount=1500,
        expense_date=date(2026, 8, 10)
    )

    expense2 = Expense(
        user_id=user.id,
        category="Travel",
        title="Bus and auto expenses",
        amount=800,
        expense_date=date(2026, 8, 11)
    )

    expense3 = Expense(
        user_id=user.id,
        category="Education",
        title="Study materials",
        amount=1200,
        expense_date=date(2026, 8, 12)
    )

    expense4 = Expense(
        user_id=user.id,
        category="Entertainment",
        title="Movie",
        amount=500,
        expense_date=date(2026, 8, 15)
    )

    budget = Budget(
        user_id=user.id,
        category="Food",
        month=8,
        year=2026,
        planned_amount=2000
    )

    savings_goal = SavingsGoal(
        user_id=user.id,
        name="New Laptop Fund",
        target_amount=60000,
        current_amount=15000,
        target_date=date(2027, 6, 1)
    )

    notification = Notification(
        user_id=user.id,
        title="Budget Reminder",
        message="Your food budget is being monitored.",
        is_read=False
    )

    db.add_all([
        profile,
        income1,
        income2,
        expense1,
        expense2,
        expense3,
        expense4,
        budget,
        savings_goal,
        notification
    ])

    db.commit()

    print("Test data created successfully.")

finally:
    db.close()
    