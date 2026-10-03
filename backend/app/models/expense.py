from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    ForeignKey,
    CheckConstraint
)
from sqlalchemy.orm import relationship

from ..database import Base


class Expense(Base):
    __tablename__ = "expenses"

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

    title = Column(
        String(150),
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    expense_date = Column(
        Date,
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_expense_amount_positive"
        ),
    )

    user = relationship(
        "User",
        back_populates="expenses"
    )