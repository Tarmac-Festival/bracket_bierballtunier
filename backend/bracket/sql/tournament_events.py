from bracket.database import database
from bracket.models.db.tournament_event import TournamentEvent, TournamentEventBody
from bracket.utils.id_types import TournamentEventId, TournamentId


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
    tournament_id: TournamentId, event_id: TournamentEventId, event_body: TournamentEventBody
) -> None:
    query = """
        UPDATE tournament_events
        SET name = :name,
            description = :description,
            start_time = :start_time,
            duration_minutes = :duration_minutes,
            blocks_matches = :blocks_matches
        WHERE tournament_events.tournament_id = :tournament_id
        AND tournament_events.id = :event_id
        """
    await database.execute(
        query=query,
        values={
            "tournament_id": tournament_id,
            "event_id": event_id,
            **event_body.model_dump(),
        },
    )


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
