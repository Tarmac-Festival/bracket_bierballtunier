"""add tournaments.registration_info

Revision ID: 9a0b864f597c
Revises: d5a6a713a14d
Create Date: 2026-08-18 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "9a0b864f597c"
down_revision: str | None = "d5a6a713a14d"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("registration_info", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "registration_info")
