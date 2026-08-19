"""add tournament_events.location and the round/match it follows

Revision ID: 7b2e4a91c605
Revises: 3f1c9d2b7a04
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "7b2e4a91c605"
down_revision: str | None = "3f1c9d2b7a04"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("tournament_events", sa.Column("location", sa.Text(), nullable=True))
    op.add_column("tournament_events", sa.Column("after_round_id", sa.BigInteger(), nullable=True))
    op.add_column("tournament_events", sa.Column("after_match_id", sa.BigInteger(), nullable=True))
    # The event falls back to its stored start time when what it followed is gone, rather
    # than blocking the deletion of a round or a match.
    op.create_foreign_key(
        "tournament_events_after_round_id_fkey",
        "tournament_events",
        "rounds",
        ["after_round_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "tournament_events_after_match_id_fkey",
        "tournament_events",
        "matches",
        ["after_match_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "tournament_events_after_match_id_fkey", "tournament_events", type_="foreignkey"
    )
    op.drop_constraint(
        "tournament_events_after_round_id_fkey", "tournament_events", type_="foreignkey"
    )
    op.drop_column("tournament_events", "after_match_id")
    op.drop_column("tournament_events", "after_round_id")
    op.drop_column("tournament_events", "location")
