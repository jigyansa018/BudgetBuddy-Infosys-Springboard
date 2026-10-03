from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models.invoice import Invoice
from ..models.user import User
from ..schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
)


router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


# ---------------------------------------------------------
# GET ALL INVOICES FOR CURRENT USER
# ---------------------------------------------------------

@router.get(
    "",
    response_model=list[InvoiceResponse],
)
def get_my_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoices = (
        db.query(Invoice)
        .filter(Invoice.user_id == current_user.id)
        .order_by(Invoice.id.desc())
        .all()
    )

    return invoices


# ---------------------------------------------------------
# CREATE INVOICE
# ---------------------------------------------------------

@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Create invoice with temporary number.
    new_invoice = Invoice(
        user_id=current_user.id,
        invoice_number="TEMP",
        client_name=invoice_data.client_name,
        description=invoice_data.description,
        invoice_date=invoice_data.invoice_date,
        amount=invoice_data.amount,
        status=invoice_data.status,
    )

    db.add(new_invoice)
    db.flush()

    # Example: INV-2026-014
    new_invoice.invoice_number = (
        f"INV-{invoice_data.invoice_date.year}-{new_invoice.id:03d}"
    )

    db.commit()
    db.refresh(new_invoice)

    return new_invoice


# ---------------------------------------------------------
# GET SINGLE INVOICE
# ---------------------------------------------------------

@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return invoice


# ---------------------------------------------------------
# UPDATE INVOICE
# ---------------------------------------------------------

@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    update_data = invoice_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)

    return invoice


# ---------------------------------------------------------
# DELETE INVOICE
# ---------------------------------------------------------

@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    db.delete(invoice)
    db.commit()

    return None