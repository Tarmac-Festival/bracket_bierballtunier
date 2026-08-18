from enum import auto

from heliclockter import datetime_utc
from pydantic import Field

from bracket.models.db.shared import BaseModelORM
from bracket.utils.id_types import ClubId, TournamentId
from bracket.utils.pydantic import EmptyStrToNone
from bracket.utils.types import EnumAutoStr


class TournamentStatus(EnumAutoStr):
    OPEN = auto()
    ARCHIVED = auto()


class TournamentInsertable(BaseModelORM):
    club_id: ClubId
    name: str
    created: datetime_utc
    start_time: datetime_utc
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)
    dashboard_public: bool
    dashboard_endpoint: str | None = None
    logo_path: str | None = None
    rules: str | None = None
    registration_enabled: bool = False
    registration_deadline: datetime_utc | None = None
    team_size_min: int = Field(1, ge=1)
    team_size_max: int = Field(8, ge=1)
    max_teams: int | None = Field(None, ge=1)
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    status: TournamentStatus = TournamentStatus.OPEN


class Tournament(TournamentInsertable):
    id: TournamentId


class TournamentUpdateBody(BaseModelORM):
    start_time: datetime_utc
    name: str
    dashboard_public: bool
    dashboard_endpoint: EmptyStrToNone | str = None
    rules: EmptyStrToNone | str = None
    registration_enabled: bool = False
    registration_deadline: datetime_utc | None = None
    team_size_min: int = Field(1, ge=1)
    team_size_max: int = Field(8, ge=1)
    max_teams: int | None = Field(None, ge=1)
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)


class TournamentChangeStatusBody(BaseModelORM):
    status: TournamentStatus


class TournamentBody(TournamentUpdateBody):
    club_id: ClubId
