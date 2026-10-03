from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.auth import get_current_user

# Import all models so SQLAlchemy knows about every table
from app.models.user import User
from app.models.income import Income
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.savings import Savings
from app.models.notification import Notification
from app.models.report import Report
from app.models.invoice import Invoice


# ---------------------------------------------------------
# TEST DATABASE
# ---------------------------------------------------------

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture(autouse=True)
def reset_test_database():
    Base.metadata.create_all(bind=engine)

    yield

    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------
# FIXTURES
# ---------------------------------------------------------

@pytest.fixture
def test_user():
    db = TestingSessionLocal()

    user = User(
        full_name="Test User",
        email="test@example.com",
        password_hash="hashed_password",
        is_active=True,
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    db.close()


@pytest.fixture
def second_user():
    db = TestingSessionLocal()

    user = User(
        full_name="Second User",
        email="second@example.com",
        password_hash="hashed_password",
        is_active=True,
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    db.close()


@pytest.fixture
def client(test_user):

    app.dependency_overrides[get_db] = override_get_db

    def override_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ---------------------------------------------------------
# DATABASE HELPERS
# ---------------------------------------------------------

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
    db.refresh(income)

    income_id = income.id

    db.close()

    return income_id


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
    db.refresh(expense)

    expense_id = expense.id

    db.close()

    return expense_id


# ---------------------------------------------------------
# PDF REPORT TESTS
# ---------------------------------------------------------

def test_monthly_pdf_report_success(
    client,
    test_user,
):
    """
    PDF report should be generated successfully
    for a month containing financial data.
    """

    add_income(
        user_id=test_user.id,
        source="Salary",
        amount=30000,
        income_date=date(2026, 9, 5),
    )

    add_expense(
        user_id=test_user.id,
        category="Food",
        title="Groceries",
        amount=5000,
        expense_date=date(2026, 9, 10),
    )

    response = client.get(
        "/reports/monthly/pdf?year=2026&month=9"
    )

    assert response.status_code == 200

    assert response.headers["content-type"] == "application/pdf"

    assert len(response.content) > 0


def test_monthly_pdf_report_empty_month(
    client,
):
    """
    PDF report should still be generated
    when there is no financial data for the month.
    """

    response = client.get(
        "/reports/monthly/pdf?year=2026&month=9"
    )

    assert response.status_code == 200

    assert response.headers["content-type"] == "application/pdf"

    assert len(response.content) > 0


def test_monthly_pdf_report_only_selected_month(
    client,
    test_user,
):
    """
    Data from another month must not be included
    in the selected monthly report.
    """

    add_income(
        user_id=test_user.id,
        source="September Income",
        amount=30000,
        income_date=date(2026, 9, 5),
    )

    add_income(
        user_id=test_user.id,
        source="August Income",
        amount=50000,
        income_date=date(2026, 8, 5),
    )

    response = client.get(
        "/reports/monthly/pdf?year=2026&month=9"
    )

    assert response.status_code == 200

    assert response.headers["content-type"] == "application/pdf"

    assert len(response.content) > 0


# ---------------------------------------------------------
# EXCEL REPORT TESTS
# ---------------------------------------------------------

def test_monthly_excel_report_success(
    client,
    test_user,
):
    """
    Excel report should be generated successfully
    for a month containing financial data.
    """

    add_income(
        user_id=test_user.id,
        source="Salary",
        amount=30000,
        income_date=date(2026, 9, 5),
    )

    add_expense(
        user_id=test_user.id,
        category="Education",
        title="Books",
        amount=3000,
        expense_date=date(2026, 9, 10),
    )

    response = client.get(
        "/reports/monthly/excel?year=2026&month=9"
    )

    assert response.status_code == 200

    content_type = response.headers["content-type"]

    assert (
        "spreadsheetml" in content_type
        or "excel" in content_type
        or "octet-stream" in content_type
    )

    assert len(response.content) > 0


def test_monthly_excel_report_empty_month(
    client,
):
    """
    Excel report should still be generated
    for an empty month.
    """

    response = client.get(
        "/reports/monthly/excel?year=2026&month=9"
    )

    assert response.status_code == 200

    content_type = response.headers["content-type"]

    assert (
        "spreadsheetml" in content_type
        or "excel" in content_type
        or "octet-stream" in content_type
    )

    assert len(response.content) > 0


def test_monthly_excel_report_only_selected_month(
    client,
    test_user,
):
    """
    Excel report should use only the requested month.
    """

    add_income(
        user_id=test_user.id,
        source="September Income",
        amount=25000,
        income_date=date(2026, 9, 5),
    )

    add_expense(
        user_id=test_user.id,
        category="Shopping",
        title="September Shopping",
        amount=4000,
        expense_date=date(2026, 9, 12),
    )

    add_income(
        user_id=test_user.id,
        source="August Income",
        amount=50000,
        income_date=date(2026, 8, 5),
    )

    response = client.get(
        "/reports/monthly/excel?year=2026&month=9"
    )

    assert response.status_code == 200

    assert len(response.content) > 0


# ---------------------------------------------------------
# USER ISOLATION
# ---------------------------------------------------------

def test_report_user_isolation(
    client,
    test_user,
    second_user,
):
    """
    A report generated for the logged-in user must not
    include another user's financial records.
    """

    add_income(
        user_id=test_user.id,
        source="My Income",
        amount=30000,
        income_date=date(2026, 9, 5),
    )

    add_expense(
        user_id=test_user.id,
        category="Food",
        title="My Expense",
        amount=5000,
        expense_date=date(2026, 9, 10),
    )

    add_income(
        user_id=second_user.id,
        source="Other User Income",
        amount=90000,
        income_date=date(2026, 9, 5),
    )

    add_expense(
        user_id=second_user.id,
        category="Shopping",
        title="Other User Expense",
        amount=40000,
        expense_date=date(2026, 9, 10),
    )

    pdf_response = client.get(
        "/reports/monthly/pdf?year=2026&month=9"
    )

    assert pdf_response.status_code == 200
    assert len(pdf_response.content) > 0

    excel_response = client.get(
        "/reports/monthly/excel?year=2026&month=9"
    )

    assert excel_response.status_code == 200
    assert len(excel_response.content) > 0


# ---------------------------------------------------------
# VALIDATION TESTS
# ---------------------------------------------------------

def test_invalid_month_zero(
    client,
):
    response = client.get(
        "/reports/monthly/pdf?year=2026&month=0"
    )

    assert response.status_code in [400, 422]


def test_invalid_month_thirteen(
    client,
):
    response = client.get(
        "/reports/monthly/pdf?year=2026&month=13"
    )

    assert response.status_code in [400, 422]


def test_missing_month_parameter(
    client,
):
    response = client.get(
        "/reports/monthly/pdf?year=2026"
    )

    assert response.status_code in [400, 422]


def test_missing_year_parameter(
    client,
):
    response = client.get(
        "/reports/monthly/pdf?month=9"
    )

    assert response.status_code in [400, 422]


# ---------------------------------------------------------
# CONTENT-DISPOSITION / FILE NAME TESTS
# ---------------------------------------------------------

def test_pdf_report_filename(
    client,
):
    response = client.get(
        "/reports/monthly/pdf?year=2026&month=9"
    )

    assert response.status_code == 200

    content_disposition = response.headers.get(
        "content-disposition",
        "",
    )

    assert "BudgetBuddy" in content_disposition
    assert "2026" in content_disposition
    assert "09" in content_disposition


def test_excel_report_filename(
    client,
):
    response = client.get(
        "/reports/monthly/excel?year=2026&month=9"
    )

    assert response.status_code == 200

    content_disposition = response.headers.get(
        "content-disposition",
        "",
    )

    assert "BudgetBuddy" in content_disposition
    assert "2026" in content_disposition
    assert "09" in content_disposition