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


class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    source = Column(
        String(100),
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    income_date = Column(
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
            name="check_income_amount_positive"
        ),
    )

    user = relationship(
        "User",
        back_populates="incomes"
    )