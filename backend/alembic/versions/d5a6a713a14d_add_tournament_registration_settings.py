"""add tournament registration settings

Revision ID: d5a6a713a14d
Revises: 4b899a235771
Create Date: 2026-08-18 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "d5a6a713a14d"
down_revision: str | None = "4b899a235771"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "tournaments",
        sa.Column("registration_enabled", sa.Boolean(), nullable=False, server_default="f"),
    )
    op.add_column(
        "tournaments", sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "tournaments",
        sa.Column("team_size_min", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "tournaments",
        sa.Column("team_size_max", sa.Integer(), nullable=False, server_default="8"),
    )
    op.add_column("tournaments", sa.Column("max_teams", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "max_teams")
    op.drop_column("tournaments", "team_size_max")
    op.drop_column("tournaments", "team_size_min")
    op.drop_column("tournaments", "registration_deadline")
    op.drop_column("tournaments", "registration_enabled")
