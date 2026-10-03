from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from ..database import Base


class Savings(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String(150), nullable=False)

    target_amount = Column(Float, nullable=False)

    current_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    target_date = Column(
        Date,
        nullable=True
    )

    description = Column(
        String(255),
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="active"
    )

    __table_args__ = (
        CheckConstraint(
            "target_amount > 0",
            name="check_savings_target_positive"
        ),
        CheckConstraint(
            "current_amount >= 0",
            name="check_savings_current_non_negative"
        ),
    )

    user = relationship(
        "User",
        back_populates="savings"
    )