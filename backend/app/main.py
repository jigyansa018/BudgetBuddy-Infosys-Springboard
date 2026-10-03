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

from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, ENVIRONMENT


app = FastAPI(
    title="BudgetBuddy API",
    description="Intelligent Student Budget Planning and Personal Expense Management Platform",
    version="1.0.0"
)   

app.add_middleware(
    CORSMiddleware, 
    allow_origins = ["https://budgetbuddy-dashboard-jnztol8t0-budget-buddy-project.vercel.app",
        ]
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# =========================================================
# Report Routes
# =========================================================


app.include_router(reports_router)

# =========================================================
# Analytics Routes
# =========================================================

app.include_router(analytics_router)


# =========================================================
# Notifications Routes
# =========================================================

app.include_router(notifications_router)



# =========================================================
# Invoices Routes
# =========================================================

app.include_router(invoices_router)

# =========================================================
# Savings Routes
# =========================================================

app.include_router(savings_router)


# =========================================================
# Budget Routes
# =========================================================
app.include_router(budget_router)

# =========================================================
# Dashboard Routes
# =========================================================
app.include_router(dashboard_router)

# =========================================================
# Income Routes
# =========================================================

app.include_router(income_router)


# =========================================================
# Authentication Routes
# =========================================================

app.include_router(auth_router)
app.include_router(oauth_router)

# =========================================================
# Expense Routes
# =========================================================

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
        "environment": ENVIRONMENT
    }