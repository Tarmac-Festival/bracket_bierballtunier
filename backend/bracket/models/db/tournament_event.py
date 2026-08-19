from heliclockter import datetime_utc, timedelta
from pydantic import Field

from bracket.models.db.shared import BaseModelORM
from bracket.utils.id_types import TournamentEventId, TournamentId


class TournamentEventBody(BaseModelORM):
    """
    Something that happens next to the matches and takes up time: a halftime show, an award
    ceremony, a break.
    """

    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    start_time: datetime_utc
    duration_minutes: int = Field(default=30, ge=1, le=24 * 60)
    blocks_matches: bool = True


class TournamentEventInsertable(TournamentEventBody):
    created: datetime_utc
    tournament_id: TournamentId


class TournamentEvent(TournamentEventInsertable):
    id: TournamentEventId

    @property
    def end_time(self) -> datetime_utc:
        return datetime_utc.from_datetime(
            self.start_time + timedelta(minutes=self.duration_minutes)
        )
