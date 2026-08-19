"""add rounds.start_time

Revision ID: 0a0c3e6ddbde
Revises: 1afd07741a51
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "0a0c3e6ddbde"
down_revision: str | None = "1afd07741a51"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("rounds", sa.Column("start_time", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("rounds", "start_time")
