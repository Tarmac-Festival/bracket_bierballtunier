from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
from heliclockter import datetime_utc

from bracket.database import database
from bracket.logic.rate_limit import registration_rate_limiter
from bracket.models.db.club import ClubInsertable
from bracket.models.db.tournament import Tournament
from bracket.schema import (
    matches,
    players,
    players_x_teams,
    rankings,
    rounds,
    stage_item_inputs,
    stage_items,
    stages,
    teams,
    tournaments,
)
from bracket.utils.dummy_records import DUMMY_MOCK_TIME, DUMMY_TOURNAMENT
from bracket.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request, send_request
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    assert_row_count_and_clear,
    inserted_club,
    inserted_tournament,
)


@pytest.fixture(autouse=True)
def reset_registration_rate_limit() -> None:
    """
    All requests come from the same address here, so without this the tests would start
    running into the rate limit meant for the public registration form.
    """
    registration_rate_limiter.reset()


@asynccontextmanager
async def tournament_with_registration(
    auth_context: AuthContext,
    *,
    enabled: bool = True,
    deadline: datetime_utc | None = None,
    team_size_min: int = 1,
    team_size_max: int = 4,
    password: str | None = None,
) -> AsyncIterator[Tournament]:
    """
    Every test gets its own tournament, so that changing the registration settings can't
    leak into the tournament shared by the other test modules.
    """
    async with inserted_tournament(
        DUMMY_TOURNAMENT.model_copy(
            update={
                "club_id": auth_context.club.id,
                "dashboard_endpoint": "registration-test",
                "registration_enabled": enabled,
                "registration_deadline": deadline,
                "registration_password": password,
                "team_size_min": team_size_min,
                "team_size_max": team_size_max,
            }
        )
    ) as tournament:
        yield tournament


async def register_team(
    tournament: Tournament, name: str, player_names: list[str], password: str | None = None
) -> dict:
    return await send_request(
        HTTPMethod.POST,
        f"tournaments/{tournament.id}/register",
        json={"name": name, "player_names": player_names, "password": password},
    )


async def merge_team(
    tournament: Tournament, auth_context: AuthContext, team_id: int, target_team_id: int
) -> dict:
    return await send_auth_request(
        HTTPMethod.POST,
        f"tournaments/{tournament.id}/teams/{team_id}/merge",
        auth_context,
        json={"target_team_id": target_team_id},
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_register_team_without_authentication(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(
        auth_context, team_size_min=2, team_size_max=4
    ) as tournament:
        response = await register_team(tournament, "Registered Team", ["Ann", "Bob"])

        assert response["data"]["name"] == "Registered Team"
        await assert_row_count_and_clear(players_x_teams, 2)
        await assert_row_count_and_clear(players, 2)
        await assert_row_count_and_clear(teams, 1)


@pytest.mark.asyncio(loop_scope="session")
async def test_register_team_is_rejected_when_registration_is_disabled(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, enabled=False) as tournament:
        response = await register_team(tournament, "Too Late", ["Ann"])

        assert response["detail"] == "Registration is not open for this tournament"
        await assert_row_count_and_clear(teams, 0)


@pytest.mark.asyncio(loop_scope="session")
async def test_register_team_is_rejected_after_the_deadline(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(
        auth_context, deadline=datetime_utc.now() - datetime_utc.resolution
    ) as tournament:
        response = await register_team(tournament, "Too Late", ["Ann"])

        assert response["detail"] == "The registration deadline has passed"
        await assert_row_count_and_clear(teams, 0)


@pytest.mark.asyncio(loop_scope="session")
async def test_register_team_is_rejected_when_team_size_is_out_of_range(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(
        auth_context, team_size_min=2, team_size_max=3
    ) as tournament:
        too_small = await register_team(tournament, "Solo", ["Ann"])
        too_large = await register_team(tournament, "Crowd", ["Ann", "Bob", "Cid", "Dee"])

        assert too_small["detail"] == "A team must have between 2 and 3 members"
        assert too_large["detail"] == "A team must have between 2 and 3 members"
        await assert_row_count_and_clear(teams, 0)


@pytest.mark.asyncio(loop_scope="session")
async def test_merge_team_moves_players_and_removes_the_source_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, team_size_max=4) as tournament:
        target = await register_team(tournament, "Target", ["Ann"])
        source = await register_team(tournament, "Source", ["Bob"])

        response = await merge_team(
            tournament, auth_context, source["data"]["id"], target["data"]["id"]
        )

        assert response["success"] is True
        remaining = await database.fetch_all(query=teams.select())
        assert [team["name"] for team in remaining] == ["Target"]

        await assert_row_count_and_clear(players_x_teams, 2)
        await assert_row_count_and_clear(players, 2)
        await assert_row_count_and_clear(teams, 1)


@pytest.mark.asyncio(loop_scope="session")
async def test_merge_team_is_rejected_when_the_result_would_be_too_large(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, team_size_max=2) as tournament:
        target = await register_team(tournament, "Target", ["Ann", "Bob"])
        source = await register_team(tournament, "Source", ["Cid"])

        response = await merge_team(
            tournament, auth_context, source["data"]["id"], target["data"]["id"]
        )

        assert response["detail"] == (
            "Merging would result in a team of 3 members, which exceeds the maximum team size of 2"
        )
        await assert_row_count_and_clear(players_x_teams, 3)
        await assert_row_count_and_clear(players, 3)
        await assert_row_count_and_clear(teams, 2)


@pytest.mark.asyncio(loop_scope="session")
async def test_creating_a_stage_item_restores_a_missing_default_ranking(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """
    A failed tournament deletion used to delete the rankings before bailing out, leaving
    tournaments that could no longer get a stage item.
    """
    async with tournament_with_registration(auth_context) as tournament:
        await database.execute(
            query=rankings.delete().where(rankings.c.tournament_id == tournament.id)
        )
        stage = await send_auth_request(
            HTTPMethod.POST, f"tournaments/{tournament.id}/stages", auth_context, json={}
        )
        assert stage["success"] is True

        stage_id = await database.fetch_val(
            query=stages.select().where(stages.c.tournament_id == tournament.id), column="id"
        )
        response = await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament.id}/stage_items",
            auth_context,
            json={"stage_id": stage_id, "type": "SINGLE_ELIMINATION", "team_count": 16},
        )

        assert response["success"] is True
        restored = await database.fetch_all(
            query=rankings.select().where(rankings.c.tournament_id == tournament.id)
        )
        assert len(restored) == 1

        # The tournament is removed when leaving the context manager, so take everything
        # the stage item created with it. Only this test creates matches, rounds and stage
        # items, so those can be cleared wholesale.
        for table in (matches, rounds, stage_items):
            await database.execute(query=table.delete())

        for table in (stage_item_inputs, stages, rankings):
            await database.execute(
                query=table.delete().where(table.c.tournament_id == tournament.id)
            )


@pytest.mark.asyncio(loop_scope="session")
async def test_registration_password_is_required_when_set(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, password="tarmac26") as tournament:
        missing = await register_team(tournament, "No Password", ["Ann"])
        wrong = await register_team(tournament, "Wrong", ["Ann"], password="nope")

        assert missing["detail"] == "The registration password is incorrect"
        assert wrong["detail"] == "The registration password is incorrect"
        await assert_row_count_and_clear(teams, 0)

        correct = await register_team(tournament, "Correct", ["Ann"], password="tarmac26")

        assert correct["data"]["name"] == "Correct"
        await assert_row_count_and_clear(players_x_teams, 1)
        await assert_row_count_and_clear(players, 1)
        await assert_row_count_and_clear(teams, 1)


@pytest.mark.asyncio(loop_scope="session")
async def test_registration_password_is_never_exposed(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, password="tarmac26") as tournament:
        # A logged out browser still sends the (empty) authorization header.
        response = await send_request(
            HTTPMethod.GET,
            f"tournaments?endpoint_name={tournament.dashboard_endpoint}",
            headers={"Authorization": "bearer "},
        )

        [data] = response["data"]
        assert "registration_password" not in data
        assert data["registration_password_required"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_split_team_distributes_players_over_the_other_teams(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, team_size_max=3) as tournament:
        first = await register_team(tournament, "First", ["Ann"])
        second = await register_team(tournament, "Second", ["Bob"])
        dissolved = await register_team(tournament, "Dissolved", ["Cid", "Dee"])

        players_of_dissolved = await database.fetch_all(
            query=players_x_teams.select().where(
                players_x_teams.c.team_id == dissolved["data"]["id"]
            )
        )
        assignments = {
            str(players_of_dissolved[0]["player_id"]): first["data"]["id"],
            str(players_of_dissolved[1]["player_id"]): second["data"]["id"],
        }
        response = await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament.id}/teams/{dissolved['data']['id']}/split",
            auth_context,
            json={"assignments": assignments},
        )

        assert response["success"] is True
        remaining = await database.fetch_all(query=teams.select())
        assert sorted(team["name"] for team in remaining) == ["First", "Second"]

        await assert_row_count_and_clear(players_x_teams, 4)
        await assert_row_count_and_clear(players, 4)
        await assert_row_count_and_clear(teams, 2)


@pytest.mark.asyncio(loop_scope="session")
async def test_split_team_is_rejected_when_a_target_would_be_too_large(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, team_size_max=2) as tournament:
        target = await register_team(tournament, "Target", ["Ann", "Bob"])
        dissolved = await register_team(tournament, "Dissolved", ["Cid"])

        [player_of_dissolved] = await database.fetch_all(
            query=players_x_teams.select().where(
                players_x_teams.c.team_id == dissolved["data"]["id"]
            )
        )
        response = await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament.id}/teams/{dissolved['data']['id']}/split",
            auth_context,
            json={
                "assignments": {str(player_of_dissolved["player_id"]): target["data"]["id"]},
            },
        )

        assert response["detail"] == (
            "'Target' would end up with 3 members, which exceeds the maximum team size of 2"
        )
        await assert_row_count_and_clear(players_x_teams, 3)
        await assert_row_count_and_clear(players, 3)
        await assert_row_count_and_clear(teams, 2)


@pytest.mark.asyncio(loop_scope="session")
async def test_merge_team_can_rename_the_remaining_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context, team_size_max=4) as tournament:
        target = await register_team(tournament, "Target", ["Ann"])
        source = await register_team(tournament, "Source", ["Bob"])

        response = await send_auth_request(
            HTTPMethod.POST,
            f"tournaments/{tournament.id}/teams/{source['data']['id']}/merge",
            auth_context,
            json={"target_team_id": target["data"]["id"], "target_team_name": "Merged Team"},
        )

        assert response["success"] is True
        remaining = await database.fetch_all(query=teams.select())
        assert [team["name"] for team in remaining] == ["Merged Team"]

        await assert_row_count_and_clear(players_x_teams, 2)
        await assert_row_count_and_clear(players, 2)
        await assert_row_count_and_clear(teams, 1)


@pytest.mark.asyncio(loop_scope="session")
async def test_tournament_cannot_be_moved_to_a_club_the_user_has_no_access_to(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_club(ClubInsertable(name="Someone Else", created=DUMMY_MOCK_TIME)) as club:
        body = {
            "name": auth_context.tournament.name,
            "club_id": club.id,
            "start_time": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
            "dashboard_public": True,
            "players_can_be_in_multiple_teams": True,
            "auto_assign_courts": True,
            "duration_minutes": 10,
            "margin_minutes": 5,
        }
        response = await send_auth_request(
            HTTPMethod.PUT, f"tournaments/{auth_context.tournament.id}", auth_context, json=body
        )

        assert response["detail"] == "Club ID is invalid"
        unchanged = await database.fetch_val(
            query=tournaments.select().where(tournaments.c.id == auth_context.tournament.id),
            column="club_id",
        )
        assert unchanged == auth_context.club.id


@pytest.mark.asyncio(loop_scope="session")
async def test_merge_team_into_itself_is_rejected(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with tournament_with_registration(auth_context) as tournament:
        team = await register_team(tournament, "Only Team", ["Ann"])

        response = await merge_team(
            tournament, auth_context, team["data"]["id"], team["data"]["id"]
        )

        assert response["detail"] == "Can't merge a team into itself"
        await assert_row_count_and_clear(players_x_teams, 1)
        await assert_row_count_and_clear(players, 1)
        await assert_row_count_and_clear(teams, 1)
