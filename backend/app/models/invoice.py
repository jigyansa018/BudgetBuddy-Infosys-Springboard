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


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    invoice_number = Column(
        String(50),
        nullable=False,
        index=True,
    )

    client_name = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        String(255),
        nullable=True,
    )

    invoice_date = Column(
        Date,
        nullable=False,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    status = Column(
        String(20),
        nullable=False,
        default="Pending",
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_invoice_amount_positive",
        ),
    )

    user = relationship(
        "User",
        back_populates="invoices",
    )