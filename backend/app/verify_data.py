from app.database import SessionLocal
from app.models import User


db = SessionLocal()

try:
    user = db.query(User).filter(
        User.email == "student@example.com"
    ).first()

    if user:
        print("USER")
        print("Name:", user.full_name)
        print("Email:", user.email)

        print("\nINCOME")
        for income in user.incomes:
            print(income.source, income.amount)

        print("\nEXPENSES")
        for expense in user.expenses:
            print(expense.category, expense.amount)

        print("\nBUDGETS")
        for budget in user.budgets:
            print(
                budget.category,
                budget.planned_amount
            )

        print("\nSAVINGS GOALS")
        for goal in user.savings_goals:
            print(
                goal.name,
                goal.current_amount,
                "/",
                goal.target_amount
            )

        print("\nNOTIFICATIONS")
        for notification in user.notifications:
            print(notification.title)

finally:
    db.close()