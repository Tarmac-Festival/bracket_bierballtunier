"""add a contact person to teams

Revision ID: b5f2a80d61c7
Revises: 9c4d7e13b2a8
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "b5f2a80d61c7"
down_revision: str | None = "9c4d7e13b2a8"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("contact_name", sa.Text(), nullable=True))
    op.add_column("teams", sa.Column("contact_phone", sa.Text(), nullable=True))
    op.add_column(
        "tournaments",
        sa.Column(
            "registration_contact_required",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("tournaments", "registration_contact_required")
    op.drop_column("teams", "contact_phone")
    op.drop_column("teams", "contact_name")
