"""arm an easter egg on a winner

Revision ID: d1b6c94ef370
Revises: c8a3f5e21d09
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "d1b6c94ef370"
down_revision: str | None = "c8a3f5e21d09"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "tournament_winners",
        sa.Column("easter_egg", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "tournament_winners", sa.Column("easter_egg_image_path", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("tournament_winners", "easter_egg_image_path")
    op.drop_column("tournament_winners", "easter_egg")
