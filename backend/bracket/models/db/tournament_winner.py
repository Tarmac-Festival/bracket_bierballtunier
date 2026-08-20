from heliclockter import datetime_utc
from pydantic import Field

from bracket.models.db.shared import BaseModelORM
from bracket.utils.id_types import TournamentId, TournamentWinnerId


class TournamentWinnerBody(BaseModelORM):
    """
    Somebody who won in an earlier year, kept next to this year's tournament so the
    dashboard can show what came before.
    """

    year: int = Field(ge=1900, le=2200)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    # An optional picture as a data URL, shrunk by the browser before it is sent.
    logo: str | None = Field(default=None, max_length=4 * 1024 * 1024)
    # Whether three clicks on this winner's logo lead somewhere, and what the first scene
    # of that somewhere looks like.
    easter_egg: bool = False
    easter_egg_image: str | None = Field(default=None, max_length=4 * 1024 * 1024)


class TournamentWinnerInsertable(BaseModelORM):
    created: datetime_utc
    tournament_id: TournamentId
    year: int
    name: str
    description: str | None = None
    logo_path: str | None = None
    easter_egg: bool = False
    easter_egg_image_path: str | None = None


class TournamentWinner(TournamentWinnerInsertable):
    id: TournamentWinnerId
