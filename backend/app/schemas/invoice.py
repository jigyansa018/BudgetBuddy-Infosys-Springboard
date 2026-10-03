from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InvoiceCreate(BaseModel):
    client_name: str = Field(
        min_length=1,
        max_length=150,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    invoice_date: date

    amount: float = Field(
        gt=0,
    )

    status: str = Field(
        default="Pending",
        max_length=20,
    )


class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    invoice_date: Optional[date] = None

    amount: Optional[float] = Field(
        default=None,
        gt=0,
    )

    status: Optional[str] = Field(
        default=None,
        max_length=20,
    )


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    invoice_number: str
    client_name: str
    description: Optional[str]
    invoice_date: date
    amount: float
    status: str