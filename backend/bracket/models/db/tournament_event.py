from heliclockter import datetime_utc, timedelta
from pydantic import Field

from bracket.models.db.shared import BaseModelORM
from bracket.utils.id_types import MatchId, RoundId, TournamentEventId, TournamentId


class TournamentEventBody(BaseModelORM):
    """
    Something that happens next to the matches and takes up time: a halftime show, an award
    ceremony, a break.

    When it follows a round or a single match, its start time is not entered but derived
    from the schedule, so it keeps up when the matches move.
    """

    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    location: str | None = Field(default=None, max_length=200)
    start_time: datetime_utc | None = None
    duration_minutes: int = Field(default=30, ge=1, le=24 * 60)
    blocks_matches: bool = True
    after_round_id: RoundId | None = None
    after_match_id: MatchId | None = None
    before_round_id: RoundId | None = None

    @property
    def is_anchored(self) -> bool:
        return (
            self.after_round_id is not None
            or self.after_match_id is not None
            or self.before_round_id is not None
        )


class TournamentEventInsertable(TournamentEventBody):
    # Always filled in: for an anchored event it is derived from the schedule.
    start_time: datetime_utc
    created: datetime_utc
    tournament_id: TournamentId


class TournamentEvent(TournamentEventInsertable):
    id: TournamentEventId

    @property
    def end_time(self) -> datetime_utc:
        return datetime_utc.from_datetime(
            self.start_time + timedelta(minutes=self.duration_minutes)
        )
