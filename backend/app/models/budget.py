from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    CheckConstraint
)
from sqlalchemy.orm import relationship

from ..database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    month = Column(
        Integer,
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False
    )

    planned_amount = Column(
        Float,
        nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "planned_amount >= 0",
            name="check_budget_amount_non_negative"
        ),
        CheckConstraint(
            "month >= 1 AND month <= 12",
            name="check_budget_month"
        ),
    )

    user = relationship(
        "User",
        back_populates="budgets"
    )