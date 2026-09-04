"""add tournaments.registration_terms and tournament_events.before_round_id

Revision ID: 9c4d7e13b2a8
Revises: 7b2e4a91c605
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "9c4d7e13b2a8"
down_revision: str | None = "7b2e4a91c605"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("registration_terms", sa.Text(), nullable=True))
    op.add_column("tournament_events", sa.Column("before_round_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "tournament_events_before_round_id_fkey",
        "tournament_events",
        "rounds",
        ["before_round_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "tournament_events_before_round_id_fkey", "tournament_events", type_="foreignkey"
    )
    op.drop_column("tournament_events", "before_round_id")
    op.drop_column("tournaments", "registration_terms")
