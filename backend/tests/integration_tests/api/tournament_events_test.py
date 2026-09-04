import pytest
from heliclockter import datetime_utc, timedelta

from bracket.database import database
from bracket.schema import matches, rounds
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


@pytest.mark.asyncio(loop_scope="session")
async def test_an_event_that_follows_a_round_starts_when_that_round_is_over(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 2, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)
        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        first_round_id = (await database.fetch_all(query=rounds.select().order_by(rounds.c.id)))[0][
            "id"
        ]
        created = await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Halftimeshow",
                "duration_minutes": 30,
                "blocks_matches": True,
                "after_round_id": first_round_id,
            },
        )

        rows = await database.fetch_all(query=matches.select())
        end_of_first_round = max(
            row["start_time"] + timedelta(minutes=row["duration_minutes"])
            for row in rows
            if row["round_id"] == first_round_id
        )
        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert listed["data"][0]["id"] == created["data"]["id"]
        assert listed["data"][0]["start_time"] == end_of_first_round.isoformat().replace(
            "+00:00", "Z"
        )

        # And the rounds after it wait for the show to be over.
        for row in rows:
            if row["round_id"] != first_round_id:
                assert row["start_time"] >= end_of_first_round + timedelta(minutes=30)
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_an_event_that_follows_a_match_moves_along_with_it(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    The event hangs off the schedule, so re-planning the matches drags it along.
    """
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)
        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        first_match = min(
            await database.fetch_all(query=matches.select()), key=lambda row: row["start_time"]
        )
        await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Siegerehrung",
                "location": "Hauptbühne",
                "duration_minutes": 20,
                "blocks_matches": False,
                "after_match_id": first_match["id"],
            },
        )
        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert listed["data"][0]["location"] == "Hauptbühne"
        before = listed["data"][0]["start_time"]

        # Push the whole first round back a day; the event has to follow.
        second_day = (datetime_utc.now() + timedelta(days=1)).replace(microsecond=0)
        await send_auth_request(
            HTTPMethod.PUT,
            f"tournaments/{tournament_id}/rounds/{first_match['round_id']}",
            auth_context,
            json={
                "name": "Round 01",
                "is_draft": False,
                "start_time": second_day.isoformat().replace("+00:00", "Z"),
            },
        )

        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        assert listed["data"][0]["start_time"] > before
        assert listed["data"][0]["start_time"] >= second_day.isoformat().replace("+00:00", "Z")
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_an_event_needs_a_time_or_something_to_follow(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_tournament_request(
        HTTPMethod.POST,
        "events",
        auth_context,
        json={"name": "Ohne Zeitpunkt", "duration_minutes": 30},
    )
    assert "start time" in response["detail"]


@pytest.mark.asyncio(loop_scope="session")
async def test_an_event_before_a_round_ends_when_that_round_starts(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    Gathering before the round: the event runs up to the moment the round begins, and the
    matches keep the slot free because the round is pinned to a time of its own.
    """
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)

        round_ids = [
            row["id"]
            for row in await database.fetch_all(query=rounds.select().order_by(rounds.c.id))
        ]
        second_day = (datetime_utc.now() + timedelta(days=1)).replace(microsecond=0)
        await send_auth_request(
            HTTPMethod.PUT,
            f"tournaments/{tournament_id}/rounds/{round_ids[1]}",
            auth_context,
            json={
                "name": "Round 02",
                "is_draft": False,
                "start_time": second_day.isoformat().replace("+00:00", "Z"),
            },
        )
        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Sammeln und melden",
                "location": "Hauptplatz",
                "duration_minutes": 30,
                "blocks_matches": True,
                "before_round_id": round_ids[1],
            },
        )

        listed = await send_tournament_request(HTTPMethod.GET, "events", auth_context, {})
        event = listed["data"][0]
        assert event["start_time"] == (second_day - timedelta(minutes=30)).isoformat().replace(
            "+00:00", "Z"
        )

        # Nothing is played during the gathering.
        for row in await database.fetch_all(query=matches.select()):
            match_end = row["start_time"] + timedelta(minutes=row["duration_minutes"])
            assert not (
                row["start_time"] < second_day and second_day - timedelta(minutes=30) < match_end
            ), f"match at {row['start_time']} runs into the gathering"
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_an_event_cannot_hang_off_two_things_at_once(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)
        round_ids = [
            row["id"]
            for row in await database.fetch_all(query=rounds.select().order_by(rounds.c.id))
        ]

        response = await send_tournament_request(
            HTTPMethod.POST,
            "events",
            auth_context,
            json={
                "name": "Verwirrend",
                "duration_minutes": 30,
                "after_round_id": round_ids[0],
                "before_round_id": round_ids[1],
            },
        )
        assert "not several" in response["detail"]
    finally:
        await clear_events_of(tournament_id)
        await clear_schedule_of(tournament_id)
