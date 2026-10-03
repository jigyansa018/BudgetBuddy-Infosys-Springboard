
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db

from .api.budget import router as budget_router
from .api.dashboard import router as dashboard_router
from .api.income import router as income_router
from .api.auth import router as auth_router
from .api.expenses import router as expense_router
from .api.savings import router as savings_router
from .api.invoices import router as invoices_router
from .api.notification import router as notifications_router
from .api.analytics import router as analytics_router
from .api.reports import router as reports_router
from .oauth import router as oauth_router

from app.config import CORS_ORIGINS, ENVIRONMENT


app = FastAPI(
    title="BudgetBuddy API",
    description=(
        "Intelligent Student Budget Planning and "
        "Personal Expense Management Platform"
    ),
    version="1.0.0",
)


# =========================================================
# CORS Configuration
# =========================================================

VERCEL_ORIGINS = [
    "https://budgetbuddy-dashboard-jnztol8t0-budget-buddy-project.vercel.app",
    "https://budgetbuddy-frontend-rho.vercel.app",
]

allowed_origins = list(
    dict.fromkeys([
        *CORS_ORIGINS,
        *VERCEL_ORIGINS,
    ])
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API Routes
# =========================================================

app.include_router(reports_router)
app.include_router(analytics_router)
app.include_router(notifications_router)
app.include_router(invoices_router)
app.include_router(savings_router)
app.include_router(budget_router)
app.include_router(dashboard_router)
app.include_router(income_router)

# Authentication routes
app.include_router(auth_router, prefix="/auth")
app.include_router(oauth_router)

app.include_router(expense_router)


# =========================================================
# Root Route
# =========================================================

@app.get("/")
def root():
    return {
        "message": "BudgetBuddy backend is running"
    }


# =========================================================
# Database Connection Test
# =========================================================

@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):
    return {
        "message": "SQLite database connection successful"
    }


# =========================================================
# Health Check
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "environment": ENVIRONMENT,
    }