import pytest

from bracket.database import database
from bracket.models.db.court import CourtInsertable
from bracket.schema import matches
from bracket.utils.dummy_records import DUMMY_MOCK_TIME
from bracket.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_court


@pytest.mark.asyncio(loop_scope="session")
async def test_scheduling_spreads_the_matches_of_one_bracket_over_all_courts(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    Courts used to be handed out per stage item, so a tournament with a single bracket
    played all of its matches on the first court while the others stayed empty.
    """
    tournament_id = auth_context.tournament.id

    async with (
        inserted_court(
            CourtInsertable(name="Court 1", created=DUMMY_MOCK_TIME, tournament_id=tournament_id)
        ),
        inserted_court(
            CourtInsertable(name="Court 2", created=DUMMY_MOCK_TIME, tournament_id=tournament_id)
        ),
    ):
        stage = await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/stages", auth_context, json={}
        )
        assert stage["success"] is True

        stage_id = await database.fetch_val(
            query="SELECT id FROM stages WHERE tournament_id = :tournament_id ORDER BY id DESC",
            values={"tournament_id": tournament_id},
        )
        stage_item = await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament_id}/stage_items",
            auth_context,
            json={"stage_id": stage_id, "type": "SINGLE_ELIMINATION", "team_count": 4},
        )
        assert stage_item["success"] is True

        scheduled = await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament_id}/schedule_matches", auth_context, json={}
        )
        assert scheduled["success"] is True

        rows = await database.fetch_all(query=matches.select())
        courts_used = {row["court_id"] for row in rows if row["court_id"] is not None}

        assert len(rows) > 1, "expected the bracket to have several matches"
        assert len(courts_used) == 2, f"matches only used courts {courts_used}"

        # Leave the tournament as the other test modules expect to find it.
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
