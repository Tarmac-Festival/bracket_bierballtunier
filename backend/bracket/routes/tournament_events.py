from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc, timedelta
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
from bracket.sql.stages import get_full_tournament_details
from bracket.sql.tournament_events import (
    sql_delete_event,
    sql_get_event,
    sql_get_events_of_tournament,
    sql_update_event,
)
from bracket.sql.tournaments import sql_get_tournament
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


async def _start_time_of(
    tournament_id: TournamentId, event_body: TournamentEventBody
) -> datetime_utc:
    """
    An event either has the time the user entered, or it follows a round or a match and
    starts when that one is over.
    """
    if event_body.after_round_id is not None and event_body.after_match_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An event can follow either a round or a match, not both",
        )

    if not event_body.is_anchored:
        if event_body.start_time is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An event needs a start time, or a round or match to follow",
            )
        return event_body.start_time

    end_time: datetime_utc | None = None
    found = False

    for stage in await get_full_tournament_details(tournament_id, no_draft_rounds=False):
        for stage_item in stage.stage_items:
            for round_ in stage_item.rounds:
                for match in round_.matches:
                    follows_this = (
                        match.id == event_body.after_match_id
                        if event_body.after_match_id is not None
                        else round_.id == event_body.after_round_id
                    )
                    if not follows_this:
                        continue

                    found = True
                    if match.start_time is not None:
                        match_end = match.start_time + timedelta(minutes=match.duration_minutes)
                        end_time = match_end if end_time is None else max(end_time, match_end)

    if not found:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The round or match to follow does not belong to this tournament",
        )

    # Not scheduled yet: park the event at the start of the tournament, the scheduler moves
    # it as soon as there are matches to hang it off.
    if end_time is None:
        return (await sql_get_tournament(tournament_id)).start_time

    return datetime_utc.from_datetime(end_time)


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
    start_time = await _start_time_of(tournament_id, event_body)
    last_record_id = await database.execute(
        query=tournament_events.insert(),
        values=TournamentEventInsertable(
            **{**event_body.model_dump(), "start_time": start_time},
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
    start_time = await _start_time_of(tournament_id, event_body)
    await sql_update_event(tournament_id, event_id, event_body, start_time)
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
