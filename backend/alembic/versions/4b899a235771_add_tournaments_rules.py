"""add tournaments.rules

Revision ID: 4b899a235771
Revises: c1ab44651e79
Create Date: 2026-08-18 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "4b899a235771"
down_revision: str | None = "c1ab44651e79"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("rules", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "rules")
