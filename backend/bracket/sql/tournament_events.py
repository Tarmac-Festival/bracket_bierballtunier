from heliclockter import datetime_utc

from bracket.database import database
from bracket.models.db.tournament_event import TournamentEvent, TournamentEventBody
from bracket.utils.id_types import MatchId, RoundId, TournamentEventId, TournamentId


async def sql_get_events_of_tournament(tournament_id: TournamentId) -> list[TournamentEvent]:
    query = """
        SELECT *
        FROM tournament_events
        WHERE tournament_events.tournament_id = :tournament_id
        ORDER BY start_time, id
        """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [TournamentEvent.model_validate(dict(x._mapping)) for x in result]


async def sql_get_event(
    tournament_id: TournamentId, event_id: TournamentEventId
) -> TournamentEvent | None:
    query = """
        SELECT *
        FROM tournament_events
        WHERE tournament_events.tournament_id = :tournament_id
        AND tournament_events.id = :event_id
        """
    result = await database.fetch_one(
        query=query, values={"tournament_id": tournament_id, "event_id": event_id}
    )
    return TournamentEvent.model_validate(dict(result._mapping)) if result is not None else None


async def sql_update_event(
    tournament_id: TournamentId,
    event_id: TournamentEventId,
    event_body: TournamentEventBody,
    start_time: datetime_utc,
) -> None:
    query = """
        UPDATE tournament_events
        SET name = :name,
            description = :description,
            location = :location,
            start_time = :start_time,
            duration_minutes = :duration_minutes,
            blocks_matches = :blocks_matches,
            after_round_id = :after_round_id,
            after_match_id = :after_match_id
        WHERE tournament_events.tournament_id = :tournament_id
        AND tournament_events.id = :event_id
        """
    await database.execute(
        query=query,
        values={
            **event_body.model_dump(),
            "start_time": start_time,
            "tournament_id": tournament_id,
            "event_id": event_id,
        },
    )


async def sql_set_event_start_time(event_id: TournamentEventId, start_time: datetime_utc) -> None:
    await database.execute(
        query="""
        UPDATE tournament_events SET start_time = :start_time WHERE id = :event_id
        """,
        values={"event_id": event_id, "start_time": start_time},
    )


async def sql_get_match_end_times(
    tournament_id: TournamentId,
) -> list[tuple[MatchId, RoundId, datetime_utc]]:
    """
    When every scheduled match of the tournament is over, so an event that follows one of
    them (or a whole round) knows when to start.
    """
    query = """
        SELECT
            matches.id AS match_id,
            matches.round_id AS round_id,
            matches.start_time + make_interval(mins => matches.duration_minutes) AS end_time
        FROM matches
        JOIN rounds ON rounds.id = matches.round_id
        JOIN stage_items ON stage_items.id = rounds.stage_item_id
        JOIN stages ON stages.id = stage_items.stage_id
        WHERE stages.tournament_id = :tournament_id
        AND matches.start_time IS NOT NULL
        """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [(row["match_id"], row["round_id"], row["end_time"]) for row in result]


async def sql_delete_event(tournament_id: TournamentId, event_id: TournamentEventId) -> None:
    query = """
        DELETE FROM tournament_events
        WHERE id = :event_id AND tournament_id = :tournament_id
        """
    await database.execute(
        query=query, values={"event_id": event_id, "tournament_id": tournament_id}
    )


async def sql_delete_events_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM tournament_events WHERE tournament_id = :tournament_id"
    await database.execute(query=query, values={"tournament_id": tournament_id})
