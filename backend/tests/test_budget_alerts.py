from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.auth import get_current_user

# Import all models so SQLAlchemy registers all tables
from app.models.user import User
from app.models.income import Income
from app.models.expense import Expense
from app.models.savings import Savings
from app.models.budget import Budget
from app.models.notification import Notification
from app.models.report import Report
from app.models.invoice import Invoice
from app.models.profile import Profile


# =========================================================
# TEST DATABASE
# =========================================================

TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# =========================================================
# DATABASE FIXTURE
# =========================================================

@pytest.fixture(autouse=True)
def reset_test_database():
    """
    Create all tables before every test and remove them
    after every test.
    """

    Base.metadata.create_all(bind=engine)

    yield

    Base.metadata.drop_all(bind=engine)


# =========================================================
# DATABASE OVERRIDE
# =========================================================

def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# TEST USER
# =========================================================

@pytest.fixture
def test_user():
    db = TestingSessionLocal()

    user = User(
        full_name="Budget Alert Test User",
        email="budget_alert_test@example.com",
        password_hash="test-password-hash",
        is_active=True,
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    db.close()


# =========================================================
# SECOND USER
# =========================================================

@pytest.fixture
def second_user():
    db = TestingSessionLocal()

    user = User(
        full_name="Second Budget Alert User",
        email="second_budget_alert@example.com",
        password_hash="test-password-hash",
        is_active=True,
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    db.close()


# =========================================================
# CLIENT FIXTURE
# =========================================================

@pytest.fixture
def client(test_user):

    app.dependency_overrides[get_db] = override_get_db

    def override_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# =========================================================
# HELPER: CREATE BUDGET
# =========================================================

def create_budget(
    user_id,
    category,
    planned_amount,
    month,
    year,
):
    db = TestingSessionLocal()

    budget = Budget(
        user_id=user_id,
        category=category,
        planned_amount=planned_amount,
        month=month,
        year=year,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    budget_id = budget.id

    db.close()

    return budget_id


# =========================================================
# HELPER: CREATE EXPENSE
# =========================================================

def create_expense(
    user_id,
    category,
    title,
    amount,
    expense_date,
):
    db = TestingSessionLocal()

    expense = Expense(
        user_id=user_id,
        category=category,
        title=title,
        amount=amount,
        expense_date=expense_date,
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    expense_id = expense.id

    db.close()

    return expense_id


# =========================================================
# HELPER: GET NOTIFICATIONS
# =========================================================

def get_notifications():
    db = TestingSessionLocal()

    notifications = (
        db.query(Notification)
        .order_by(Notification.id.asc())
        .all()
    )

    db.close()

    return notifications


# =========================================================
# TEST 1
# BELOW 80% SHOULD NOT CREATE BUDGET ALERT
# =========================================================

def test_budget_below_threshold_no_budget_alert(
    client,
    test_user,
):
    today = date.today()

    budget_id = create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Lunch",
        amount=500,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] >= 1

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 2
# EXACTLY 80% SHOULD CREATE BUDGET ALERT
# =========================================================

def test_budget_exactly_80_percent_creates_alert(
    client,
    test_user,
):
    today = date.today()

    budget_id = create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food Expense",
        amount=800,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] >= 1
    assert "Budget limit alert" in data["notifications_created"]

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 1

    notification = budget_notifications[0]

    assert notification.title == "Budget Alert"
    assert notification.is_read is False
    assert notification.link == f"/budget/{budget_id}"


# =========================================================
# TEST 3
# ABOVE 80% SHOULD CREATE BUDGET ALERT
# =========================================================

def test_budget_above_80_percent_creates_alert(
    client,
    test_user,
):
    today = date.today()

    budget_id = create_budget(
        user_id=test_user.id,
        category="Travel",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    create_expense(
        user_id=test_user.id,
        category="Travel",
        title="Travel Expense",
        amount=900,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] >= 1
    assert "Budget limit alert" in data["notifications_created"]

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 1

    assert "90%" in budget_notifications[0].message


# =========================================================
# TEST 4
# CATEGORY-SPECIFIC BUDGET
# =========================================================

def test_category_specific_budget(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    # Food expense reaches 80%
    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food",
        amount=800,
        expense_date=today,
    )

    # Travel expense must NOT affect Food budget
    create_expense(
        user_id=test_user.id,
        category="Travel",
        title="Travel",
        amount=5000,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 1

    assert "Food" in budget_notifications[0].message


# =========================================================
# TEST 5
# EXPENSE FROM DIFFERENT MONTH SHOULD NOT COUNT
# =========================================================

def test_expense_from_different_month_not_counted(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    # Expense is only 50% in the current month
    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Current Month Food",
        amount=500,
        expense_date=today,
    )

    # Large expense from previous month
    if today.month == 1:
        previous_month = date(
            today.year - 1,
            12,
            15,
        )
    else:
        previous_month = date(
            today.year,
            today.month - 1,
            15,
        )

    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Previous Month Food",
        amount=5000,
        expense_date=previous_month,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 6
# EXPENSE FROM DIFFERENT CATEGORY SHOULD NOT COUNT
# =========================================================

def test_expense_from_different_category_not_counted(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Education",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    # Education = 50%
    create_expense(
        user_id=test_user.id,
        category="Education",
        title="Books",
        amount=500,
        expense_date=today,
    )

    # Food should not affect Education budget
    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food",
        amount=5000,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 7
# DUPLICATE BUDGET ALERT SHOULD NOT BE CREATED
# =========================================================

def test_duplicate_budget_alert_prevention(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Shopping",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    create_expense(
        user_id=test_user.id,
        category="Shopping",
        title="Shopping",
        amount=800,
        expense_date=today,
    )

    # First check
    first_response = client.post(
        "/notifications/check-alerts"
    )

    assert first_response.status_code == 200

    first_notifications = get_notifications()

    first_budget_notifications = [
        notification
        for notification in first_notifications
        if notification.type == "budget"
    ]

    assert len(first_budget_notifications) == 1

    # Second check
    second_response = client.post(
        "/notifications/check-alerts"
    )

    assert second_response.status_code == 200

    second_notifications = get_notifications()

    second_budget_notifications = [
        notification
        for notification in second_notifications
        if notification.type == "budget"
    ]

    # Still only one budget notification
    assert len(second_budget_notifications) == 1


# =========================================================
# TEST 8
# NO BUDGET SHOULD CREATE NO BUDGET ALERT
# =========================================================

def test_no_budget_no_budget_alert(
    client,
    test_user,
):
    today = date.today()

    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food",
        amount=5000,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 9
# NO EXPENSE SHOULD CREATE NO BUDGET ALERT
# =========================================================

def test_no_expense_no_budget_alert(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Entertainment",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 10
# ZERO PLANNED BUDGET SHOULD NOT CREATE ALERT
# =========================================================

def test_zero_planned_budget_no_alert(
    client,
    test_user,
):
    today = date.today()

    create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=0,
        month=today.month,
        year=today.year,
    )

    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food",
        amount=500,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 0


# =========================================================
# TEST 11
# USER ISOLATION
# =========================================================

def test_budget_alert_user_isolation(
    client,
    test_user,
    second_user,
):
    today = date.today()

    # Second user's budget
    create_budget(
        user_id=second_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    # Second user's expense reaches 80%
    create_expense(
        user_id=second_user.id,
        category="Food",
        title="Second User Food",
        amount=800,
        expense_date=today,
    )

    # Logged-in user has no budget
    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    # Logged-in user should have no budget notification
    db = TestingSessionLocal()

    current_user_budget_notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == test_user.id,
            Notification.type == "budget",
        )
        .all()
    )

    second_user_budget_notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == second_user.id,
            Notification.type == "budget",
        )
        .all()
    )

    db.close()

    assert len(current_user_budget_notifications) == 0
    assert len(second_user_budget_notifications) == 0


# =========================================================
# TEST 12
# MULTIPLE BUDGETS
# =========================================================

def test_multiple_budget_alerts(
    client,
    test_user,
):
    today = date.today()

    # Food budget
    create_budget(
        user_id=test_user.id,
        category="Food",
        planned_amount=1000,
        month=today.month,
        year=today.year,
    )

    # Travel budget
    create_budget(
        user_id=test_user.id,
        category="Travel",
        planned_amount=2000,
        month=today.month,
        year=today.year,
    )

    # Food reaches 80%
    create_expense(
        user_id=test_user.id,
        category="Food",
        title="Food",
        amount=800,
        expense_date=today,
    )

    # Travel reaches 90%
    create_expense(
        user_id=test_user.id,
        category="Travel",
        title="Travel",
        amount=1800,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] >= 2

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 2

    messages = [
        notification.message
        for notification in budget_notifications
    ]

    assert any("Food" in message for message in messages)
    assert any("Travel" in message for message in messages)


# =========================================================
# TEST 13
# BUDGET ALERT MESSAGE CONTENT
# =========================================================

def test_budget_alert_message_content(
    client,
    test_user,
):
    today = date.today()

    budget_id = create_budget(
    user_id=test_user.id,
    category="Education",
    planned_amount=2000,
    month=today.month,
    year=today.year,
)

    create_expense(
        user_id=test_user.id,
        category="Education",
        title="Books",
        amount=1600,
        expense_date=today,
    )

    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    notifications = get_notifications()

    budget_notifications = [
        notification
        for notification in notifications
        if notification.type == "budget"
    ]

    assert len(budget_notifications) == 1

    notification = budget_notifications[0]

    assert notification.type == "budget"
    assert notification.title == "Budget Alert"
    assert "Education" in notification.message
    assert "80%" in notification.message
    assert notification.is_read is False
    assert notification.link == f"/budget/{budget_id}"


# =========================================================
# TEST 14
# CHECK-ALERTS RESPONSE STRUCTURE
# =========================================================

def test_check_alerts_response_structure(
    client,
    test_user,
):
    response = client.post(
        "/notifications/check-alerts"
    )

    assert response.status_code == 200

    data = response.json()

    assert "message" in data
    assert "notifications_created" in data
    assert "count" in data

    assert data["message"] == (
        "Financial alerts checked successfully"
    )

    assert isinstance(
        data["notifications_created"],
        list,
    )

    assert isinstance(
        data["count"],
        int,
    )

    assert data["count"] == len(
        data["notifications_created"]
    )