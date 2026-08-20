"""add tournament_winners and teams.description

Revision ID: c8a3f5e21d09
Revises: b5f2a80d61c7
Create Date: 2026-08-19 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "c8a3f5e21d09"
down_revision: str | None = "b5f2a80d61c7"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("description", sa.Text(), nullable=True))
    op.create_table(
        "tournament_winners",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("tournament_id", sa.BigInteger(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_path", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tournament_winners_id"), "tournament_winners", ["id"], unique=False)
    op.create_index(
        op.f("ix_tournament_winners_tournament_id"),
        "tournament_winners",
        ["tournament_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tournament_winners_tournament_id"), table_name="tournament_winners")
    op.drop_index(op.f("ix_tournament_winners_id"), table_name="tournament_winners")
    op.drop_table("tournament_winners")
    op.drop_column("teams", "description")
