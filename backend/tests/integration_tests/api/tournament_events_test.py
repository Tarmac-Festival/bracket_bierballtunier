import pytest
from heliclockter import datetime_utc, timedelta

from bracket.database import database
from bracket.schema import matches
from bracket.utils.http import HTTPMethod
from tests.integration_tests.api.scheduling_test import (
    add_courts,
    add_elimination_stage_item,
    clear_schedule_of,
)
from tests.integration_tests.api.shared import send_auth_request, send_tournament_request
from tests.integration_tests.models import AuthContext


async def clear_events_of(tournament_id: int) -> None:
    await database.execute(
        query="DELETE FROM tournament_events WHERE tournament_id = :tournament_id",
        values={"tournament_id": tournament_id},
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_create_read_update_delete_event(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id
    start_time = datetime_utc.now().replace(microsecond=0)

    try:
        created = await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Halftimeshow",
                "description": "Auf der Hauptbühne",
                "start_time": start_time.isoformat().replace("+00:00", "Z"),
                "duration_minutes": 45,
                "blocks_matches": True,
            },
        )
        event_id = created["data"]["id"]
        assert created["data"]["name"] == "Halftimeshow"
        assert created["data"]["duration_minutes"] == 45

        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert [event["name"] for event in listed["data"]] == ["Halftimeshow"]

        await send_auth_request(
            HTTPMethod.PUT,
            f"tournaments/{tournament_id}/events/{event_id}",
            auth_context,
            json={
                "name": "Siegerehrung",
                "description": None,
                "start_time": start_time.isoformat().replace("+00:00", "Z"),
                "duration_minutes": 20,
                "blocks_matches": False,
            },
        )
        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert listed["data"][0]["name"] == "Siegerehrung"
        assert listed["data"][0]["blocks_matches"] is False

        await send_auth_request(
            HTTPMethod.DELETE, f"tournaments/{tournament_id}/events/{event_id}", auth_context
        )
        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert listed["data"] == []
    finally:
        await clear_events_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_a_blocking_event_pushes_the_matches_that_would_run_into_it(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    A halftime show claims the whole tournament, so nothing is played alongside it.
    """
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)
        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        before = sorted(
            row["start_time"] for row in await database.fetch_all(query=matches.select())
        )
        assert len(before) > 1, "expected the bracket to have several matches"

        # Right on top of the second match, so it has to give way.
        event_start = before[1]
        event_end = event_start + timedelta(minutes=60)
        await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Halftimeshow",
                "start_time": event_start.isoformat().replace("+00:00", "Z"),
                "duration_minutes": 60,
                "blocks_matches": True,
            },
        )

        rows = await database.fetch_all(query=matches.select())
        for row in rows:
            match_end = row["start_time"] + timedelta(minutes=row["duration_minutes"])
            assert not (row["start_time"] < event_end and event_start < match_end), (
                f"match at {row['start_time']} still overlaps the event"
            )

        assert min(row["start_time"] for row in rows) == before[0], (
            "the matches before the event should keep their slot"
        )
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_a_non_blocking_event_leaves_the_schedule_alone(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)
        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        before = sorted(
            row["start_time"] for row in await database.fetch_all(query=matches.select())
        )
        await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Siegerehrung",
                "start_time": before[1].isoformat().replace("+00:00", "Z"),
                "duration_minutes": 60,
                "blocks_matches": False,
            },
        )

        after = sorted(
            row["start_time"] for row in await database.fetch_all(query=matches.select())
        )
        assert after == before
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)
