"""add notifications table

Revision ID: 62f6c8b772a6
Revises: e1a3a250efdd
Create Date: 2026-09-27 11:49:04.593006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '62f6c8b772a6'
down_revision: Union[str, Sequence[str], None] = 'e1a3a250efdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        op.f('ix_notifications_user_id'),
        'notifications',
        ['user_id'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_notifications_user_id'),
        table_name='notifications'
    )
