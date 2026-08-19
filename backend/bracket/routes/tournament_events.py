from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc
from starlette import status

from bracket.config import config
from bracket.database import database
from bracket.logic.planning.matches import (
    reschedule_matches_around_events,
)
from bracket.models.db.tournament import Tournament
from bracket.models.db.tournament_event import (
    TournamentEvent,
    TournamentEventBody,
    TournamentEventInsertable,
)
from bracket.models.db.user import UserPublic
from bracket.routes.auth import (
    user_authenticated_for_tournament,
    user_authenticated_or_public_dashboard,
)
from bracket.routes.models import (
    SingleTournamentEventResponse,
    SuccessResponse,
    TournamentEventsResponse,
)
from bracket.routes.util import disallow_archived_tournament
from bracket.schema import tournament_events
from bracket.sql.tournament_events import (
    sql_delete_event,
    sql_get_event,
    sql_get_events_of_tournament,
    sql_update_event,
)
from bracket.utils.id_types import TournamentEventId, TournamentId
from bracket.utils.types import assert_some

router = APIRouter(prefix=config.api_prefix)


async def _get_event_or_404(
    tournament_id: TournamentId, event_id: TournamentEventId
) -> TournamentEvent:
    event = await sql_get_event(tournament_id, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.get("/tournaments/{tournament_id}/events", response_model=TournamentEventsResponse)
async def get_events(
    tournament_id: TournamentId,
    _: UserPublic = Depends(user_authenticated_or_public_dashboard),
) -> TournamentEventsResponse:
    return TournamentEventsResponse(data=await sql_get_events_of_tournament(tournament_id))


@router.post("/tournaments/{tournament_id}/events", response_model=SingleTournamentEventResponse)
async def create_event(
    tournament_id: TournamentId,
    event_body: TournamentEventBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SingleTournamentEventResponse:
    last_record_id = await database.execute(
        query=tournament_events.insert(),
        values=TournamentEventInsertable(
            **event_body.model_dump(),
            created=datetime_utc.now(),
            tournament_id=tournament_id,
        ).model_dump(),
    )
    await reschedule_matches_around_events(tournament_id)
    return SingleTournamentEventResponse(
        data=assert_some(await sql_get_event(tournament_id, TournamentEventId(last_record_id)))
    )


@router.put(
    "/tournaments/{tournament_id}/events/{event_id}", response_model=SingleTournamentEventResponse
)
async def update_event(
    tournament_id: TournamentId,
    event_id: TournamentEventId,
    event_body: TournamentEventBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SingleTournamentEventResponse:
    await _get_event_or_404(tournament_id, event_id)
    await sql_update_event(tournament_id, event_id, event_body)
    await reschedule_matches_around_events(tournament_id)
    return SingleTournamentEventResponse(
        data=assert_some(await sql_get_event(tournament_id, event_id))
    )


@router.delete("/tournaments/{tournament_id}/events/{event_id}", response_model=SuccessResponse)
async def delete_event(
    tournament_id: TournamentId,
    event_id: TournamentEventId,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SuccessResponse:
    await _get_event_or_404(tournament_id, event_id)
    await sql_delete_event(tournament_id, event_id)
    await reschedule_matches_around_events(tournament_id)
    return SuccessResponse()
