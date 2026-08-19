import pytest
from heliclockter import datetime_utc, timedelta

from bracket.database import database
from bracket.schema import matches, rounds
from bracket.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request
from tests.integration_tests.models import AuthContext


async def add_courts(tournament_id: int, count: int, auth_context: AuthContext) -> None:
    for index in range(count):
        await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament_id}/courts",
            auth_context,
            json={"name": f"Court {index + 1}"},
        )


async def add_elimination_stage_item(
    tournament_id: int, team_count: int, auth_context: AuthContext
) -> None:
    await send_auth_request(
        HTTPMethod.POST, f"tournaments/{tournament_id}/stages", auth_context, json={}
    )
    stage_id = await database.fetch_val(
        query="SELECT id FROM stages WHERE tournament_id = :tournament_id ORDER BY id DESC",
        values={"tournament_id": tournament_id},
    )
    await send_auth_request(
        HTTPMethod.POST,
        f"tournaments/{tournament_id}/stage_items",
        auth_context,
        json={"stage_id": stage_id, "type": "SINGLE_ELIMINATION", "team_count": team_count},
    )


async def clear_schedule_of(tournament_id: int) -> None:
    """
    Removes everything these tests create, in the order the foreign keys allow, so the
    tournament is left as the other test modules expect to find it.
    """
    await database.execute(query="DELETE FROM matches")
    await database.execute(query="DELETE FROM rounds")
    await database.execute(
        query="DELETE FROM stage_item_inputs WHERE tournament_id = :tournament_id",
        values={"tournament_id": tournament_id},
    )
    await database.execute(query="DELETE FROM stage_items")
    await database.execute(
        query="DELETE FROM stages WHERE tournament_id = :tournament_id",
        values={"tournament_id": tournament_id},
    )
    await database.execute(
        query="DELETE FROM courts WHERE tournament_id = :tournament_id",
        values={"tournament_id": tournament_id},
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_a_round_start_time_pushes_that_round_and_the_ones_after_it(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    Lets a tournament run over several days: the later rounds are pinned to another date
    instead of following straight on from the previous round.
    """
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 1, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)

        round_ids = [
            row["id"]
            for row in await database.fetch_all(query=rounds.select().order_by(rounds.c.id))
        ]
        # Whole seconds, because the database does not store microseconds.
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

        scheduled = {
            row["round_id"]: row["start_time"] for row in await database.fetch_all(matches.select())
        }
        assert scheduled[round_ids[0]] < second_day, "first round should keep its original slot"
        assert scheduled[round_ids[1]] >= second_day, "second round should wait for its start time"
    finally:
        await clear_schedule_of(tournament_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_scheduling_spreads_the_matches_of_one_bracket_over_all_courts(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    Courts used to be handed out per stage item, so a tournament with a single bracket
    played all of its matches on the first court while the others stayed empty.
    """
    tournament_id = auth_context.tournament.id

    try:
        await add_courts(tournament_id, 2, auth_context)
        await add_elimination_stage_item(tournament_id, 4, auth_context)

        await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )

        rows = await database.fetch_all(query=matches.select())
        courts_used = {row["court_id"] for row in rows if row["court_id"] is not None}

        assert len(rows) > 1, "expected the bracket to have several matches"
        assert len(courts_used) == 2, f"matches only used courts {courts_used}"
    finally:
        await clear_schedule_of(tournament_id)
