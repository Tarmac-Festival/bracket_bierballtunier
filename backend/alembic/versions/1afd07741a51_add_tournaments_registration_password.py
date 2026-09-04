"""add tournaments.registration_password

Revision ID: 1afd07741a51
Revises: 9a0b864f597c
Create Date: 2026-08-18 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str | None = "1afd07741a51"
down_revision: str | None = "9a0b864f597c"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("registration_password", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "registration_password")
