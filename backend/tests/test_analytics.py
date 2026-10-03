from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.auth import get_current_user

# Import all models so SQLAlchemy tables and relationships are registered
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
    Create a fresh database schema before every test
    and remove it after every test.
    """

    # Create all tables before the test
    Base.metadata.create_all(bind=engine)

    yield

    # Remove all tables after the test
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
        full_name="Analytics Test User",
        email="analytics_test@example.com",
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
    """
    Creates a FastAPI TestClient and overrides authentication
    so every request is made as test_user.
    """

    app.dependency_overrides[get_db] = override_get_db

    def override_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_current_user

    with TestClient(app) as test_client:
        yield test_client

    # Clear dependency overrides after the test
    app.dependency_overrides.clear()


# =========================================================
# HELPER: CREATE INCOME
# =========================================================

def add_income(
    user_id,
    source,
    amount,
    income_date,
    description=None,
):
    db = TestingSessionLocal()

    income = Income(
        user_id=user_id,
        source=source,
        amount=amount,
        income_date=income_date,
        description=description,
    )

    db.add(income)
    db.commit()

    db.close()


# =========================================================
# HELPER: CREATE EXPENSE
# =========================================================

def add_expense(
    user_id,
    category,
    title,
    amount,
    expense_date,
    description=None,
):
    db = TestingSessionLocal()

    expense = Expense(
        user_id=user_id,
        category=category,
        title=title,
        amount=amount,
        expense_date=expense_date,
        description=description,
    )

    db.add(expense)
    db.commit()

    db.close()


# =========================================================
# TEST 1
# FINANCIAL SUMMARY
# =========================================================

def test_analytics_summary(client, test_user):

    add_income(
        test_user.id,
        "Salary",
        30000,
        date(2026, 9, 1),
    )

    add_expense(
        test_user.id,
        "Food",
        "Lunch",
        500,
        date(2026, 9, 2),
    )

    add_expense(
        test_user.id,
        "Travel",
        "Bus",
        1000,
        date(2026, 9, 3),
    )

    response = client.get("/analytics/summary")

    assert response.status_code == 200

    data = response.json()

    assert data["total_income"] == 30000
    assert data["total_expenses"] == 1500
    assert data["remaining_balance"] == 28500
    assert data["total_saved"] == 0


# =========================================================
# TEST 2
# CATEGORY-WISE EXPENSE SUMMARY
# =========================================================

def test_expenses_by_category(client, test_user):

    add_expense(
        test_user.id,
        "Food",
        "Lunch",
        500,
        date(2026, 9, 1),
    )

    add_expense(
        test_user.id,
        "Food",
        "Dinner",
        300,
        date(2026, 9, 2),
    )

    add_expense(
        test_user.id,
        "Travel",
        "Bus",
        200,
        date(2026, 9, 3),
    )

    response = client.get(
        "/analytics/expenses-by-category"
    )

    assert response.status_code == 200

    data = response.json()

    category_totals = {
        item["category"]: item["total"]
        for item in data
    }

    assert category_totals["Food"] == 800
    assert category_totals["Travel"] == 200


# =========================================================
# TEST 3
# MULTIPLE TRANSACTIONS SAME CATEGORY
# =========================================================

def test_multiple_transactions_same_category(client, test_user):

    add_expense(
        test_user.id,
        "Food",
        "Breakfast",
        100,
        date(2026, 9, 1),
    )

    add_expense(
        test_user.id,
        "Food",
        "Lunch",
        200,
        date(2026, 9, 2),
    )

    add_expense(
        test_user.id,
        "Food",
        "Dinner",
        300,
        date(2026, 9, 3),
    )

    response = client.get(
        "/analytics/expenses-by-category"
    )

    assert response.status_code == 200

    data = response.json()

    food = next(
        item
        for item in data
        if item["category"] == "Food"
    )

    assert food["total"] == 600


# =========================================================
# TEST 4
# MONTHLY TRENDS
# =========================================================

def test_monthly_trends(client, test_user):

    add_income(
        test_user.id,
        "Salary",
        30000,
        date(2026, 9, 1),
    )

    add_expense(
        test_user.id,
        "Food",
        "Food",
        500,
        date(2026, 9, 2),
    )

    add_expense(
        test_user.id,
        "Travel",
        "Travel",
        1000,
        date(2026, 9, 3),
    )

    response = client.get(
        "/analytics/monthly-trends"
    )

    assert response.status_code == 200

    data = response.json()

    september = next(
        item
        for item in data
        if item["month"] == "2026-09"
    )

    assert september["income"] == 30000
    assert september["expenses"] == 1500
    assert september["balance"] == 28500


# =========================================================
# TEST 5
# MONTH FILTER
# =========================================================

def test_monthly_trends_with_filter(client, test_user):

    add_income(
        test_user.id,
        "Salary",
        30000,
        date(2026, 9, 1),
    )

    add_expense(
        test_user.id,
        "Food",
        "Lunch",
        1500,
        date(2026, 9, 2),
    )

    response = client.get(
        "/analytics/monthly-trends"
        "?month=9&year=2026"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1

    assert data[0]["month"] == "2026-09"
    assert data[0]["income"] == 30000
    assert data[0]["expenses"] == 1500
    assert data[0]["balance"] == 28500


# =========================================================
# TEST 6
# EMPTY PERIOD
# =========================================================

def test_empty_month(client, test_user):

    response = client.get(
        "/analytics/monthly-trends"
        "?month=1&year=2025"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1

    assert data[0]["month"] == "2025-01"
    assert data[0]["income"] == 0
    assert data[0]["expenses"] == 0
    assert data[0]["balance"] == 0


# =========================================================
# TEST 7
# INVALID MONTH 13
# =========================================================

def test_invalid_month_13(client):

    response = client.get(
        "/analytics/monthly-trends"
        "?month=13&year=2026"
    )

    assert response.status_code == 422


# =========================================================
# TEST 8
# INVALID MONTH 0
# =========================================================

def test_invalid_month_0(client):

    response = client.get(
        "/analytics/monthly-trends"
        "?month=0&year=2026"
    )

    assert response.status_code == 422


# =========================================================
# TEST 9
# INVALID YEAR 0
# =========================================================

def test_invalid_year_0(client):

    response = client.get(
        "/analytics/monthly-trends"
        "?month=9&year=0"
    )

    assert response.status_code == 422


# =========================================================
# TEST 10
# MONTH WITHOUT YEAR
# =========================================================

def test_month_without_year(client):

    response = client.get(
        "/analytics/monthly-trends"
        "?month=9"
    )

    assert response.status_code == 400


# =========================================================
# TEST 11
# YEAR WITHOUT MONTH
# =========================================================

def test_year_without_month(client):

    response = client.get(
        "/analytics/monthly-trends"
        "?year=2026"
    )

    assert response.status_code == 400


# =========================================================
# TEST 12
# USER DATA ISOLATION
# =========================================================

def test_user_data_isolation(client, test_user):

    db = TestingSessionLocal()

    second_user = User(
        full_name="Second Test User",
        email="second_test@example.com",
        password_hash="test-password-hash",
        is_active=True,
        role="user",
    )

    db.add(second_user)
    db.commit()
    db.refresh(second_user)

    second_user_id = second_user.id

    db.close()

    # Income belonging to logged-in user
    add_income(
        test_user.id,
        "Salary",
        30000,
        date(2026, 9, 1),
    )

    # Income belonging to another user
    add_income(
        second_user_id,
        "Salary",
        99999,
        date(2026, 9, 1),
    )

    response = client.get(
        "/analytics/summary"
    )

    assert response.status_code == 200

    data = response.json()

    # Only logged-in user's income should appear
    assert data["total_income"] == 30000
    assert data["total_income"] != 129999


# =========================================================
# TEST 13
# ZERO / EMPTY SUMMARY
# =========================================================

def test_zero_values(client):

    response = client.get(
        "/analytics/summary"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_income"] == 0
    assert data["total_expenses"] == 0
    assert data["remaining_balance"] == 0
    assert data["total_saved"] == 0


# =========================================================
# TEST 14
# EMPTY CATEGORY DATA
# =========================================================

def test_empty_category_summary(client):

    response = client.get(
        "/analytics/expenses-by-category"
    )

    assert response.status_code == 200

    data = response.json()

    assert data == []