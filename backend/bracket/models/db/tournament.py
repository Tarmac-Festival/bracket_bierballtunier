from enum import auto

from heliclockter import datetime_utc
from pydantic import Field, computed_field

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
    registration_info: str | None = None
    # One confirmation per line, each of which the team has to tick off to register.
    registration_terms: str | None = None
    registration_contact_required: bool = False
    registration_password: str | None = None
    registration_deadline: datetime_utc | None = None
    team_size_min: int = Field(default=1, ge=1)
    team_size_max: int = Field(default=8, ge=1)
    max_teams: int | None = Field(default=None, ge=1)
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    status: TournamentStatus = TournamentStatus.OPEN


class Tournament(TournamentInsertable):
    id: TournamentId

    # Excluded from responses: anyone can read the tournament once registration is open, so
    # serializing the password would hand it to the very people it is meant to keep out.
    # It stays readable server-side, and `registration_password_required` tells the
    # registration page whether to ask for it.
    registration_password: str | None = Field(default=None, exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def registration_password_required(self) -> bool:
        return self.registration_password is not None


class TournamentUpdateBody(BaseModelORM):
    club_id: ClubId
    start_time: datetime_utc
    name: str
    dashboard_public: bool
    dashboard_endpoint: EmptyStrToNone | str = None
    rules: EmptyStrToNone | str = None
    registration_enabled: bool = False
    registration_info: EmptyStrToNone | str = None
    registration_terms: EmptyStrToNone | str = None
    registration_contact_required: bool = False
    # The password is never sent back to the client, so an empty field means "leave as is".
    # Clearing it needs the explicit flag below.
    registration_password: EmptyStrToNone | str = None
    remove_registration_password: bool = False
    registration_deadline: datetime_utc | None = None
    team_size_min: int = Field(default=1, ge=1)
    team_size_max: int = Field(default=8, ge=1)
    max_teams: int | None = Field(default=None, ge=1)
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)


class TournamentChangeStatusBody(BaseModelORM):
    status: TournamentStatus


class TournamentBody(TournamentUpdateBody):
    pass
