from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship

from ..database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    phone = Column(String(20), nullable=True)

    date_of_birth = Column(Date, nullable=True)

    currency = Column(
        String(10),
        nullable=False,
        default="INR"
    )

    financial_preference = Column(
        String(100),
        nullable=True
    )

    user = relationship(
        "User",
        back_populates="profile"
    )