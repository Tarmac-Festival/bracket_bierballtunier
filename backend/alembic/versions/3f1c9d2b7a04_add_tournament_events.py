"""add tournament_events

Revision ID: 3f1c9d2b7a04
Revises: 0a0c3e6ddbde
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "3f1c9d2b7a04"
down_revision: str | None = "0a0c3e6ddbde"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "tournament_events",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("tournament_id", sa.BigInteger(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("blocks_matches", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tournament_events_id"), "tournament_events", ["id"], unique=False)
    op.create_index(
        op.f("ix_tournament_events_tournament_id"),
        "tournament_events",
        ["tournament_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tournament_events_tournament_id"), table_name="tournament_events")
    op.drop_index(op.f("ix_tournament_events_id"), table_name="tournament_events")
    op.drop_table("tournament_events")
