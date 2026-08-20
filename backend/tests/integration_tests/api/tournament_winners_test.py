import base64

import aiofiles.os
import pytest

from bracket.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request, send_tournament_request
from tests.integration_tests.models import AuthContext

# The smallest possible PNG, so the test needs no fixture on disk.
TINY_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="


@pytest.mark.asyncio(loop_scope="session")
async def test_winners_of_earlier_years_are_kept_newest_first(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id

    try:
        for year in (2023, 2025, 2024):
            await send_tournament_request(
                HTTPMethod.POST,
                "winners",
                auth_context,
                json={"year": year, "name": f"Sieger {year}"},
            )

        listed = await send_tournament_request(HTTPMethod.GET, "winners", auth_context, {})
        assert [winner["year"] for winner in listed["data"]] == [2025, 2024, 2023]
    finally:
        for winner in (await send_tournament_request(HTTPMethod.GET, "winners", auth_context, {}))[
            "data"
        ]:
            await send_auth_request(
                HTTPMethod.DELETE,
                f"tournaments/{tournament_id}/winners/{winner['id']}",
                auth_context,
            )


@pytest.mark.asyncio(loop_scope="session")
async def test_a_winner_keeps_its_picture_when_only_the_text_is_edited(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id
    created = await send_tournament_request(
        HTTPMethod.POST,
        "winners",
        auth_context,
        json={
            "year": 2025,
            "name": "Die Alten Hasen",
            "description": "Ungeschlagen durch alle Runden",
            "logo": f"data:image/png;base64,{TINY_PNG}",
        },
    )
    winner_id = created["data"]["id"]
    logo_path = created["data"]["logo_path"]

    try:
        assert logo_path is not None
        assert await aiofiles.os.path.exists(f"static/winner-logos/{logo_path}")

        updated = await send_auth_request(
            HTTPMethod.PUT,
            f"tournaments/{tournament_id}/winners/{winner_id}",
            auth_context,
            json={"year": 2025, "name": "Die Alten Hasen", "description": "Ohne Gegentor"},
        )
        assert updated["data"]["logo_path"] == logo_path
        assert updated["data"]["description"] == "Ohne Gegentor"
    finally:
        await send_auth_request(
            HTTPMethod.DELETE, f"tournaments/{tournament_id}/winners/{winner_id}", auth_context
        )

    # Deleting the entry takes its picture with it rather than leaving it on disk forever.
    assert not await aiofiles.os.path.exists(f"static/winner-logos/{logo_path}")


@pytest.mark.asyncio(loop_scope="session")
async def test_a_winner_needs_a_plausible_year(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_tournament_request(
        HTTPMethod.POST, "winners", auth_context, json={"year": 12, "name": "Zu frueh"}
    )
    assert "detail" in response


@pytest.mark.asyncio(loop_scope="session")
async def test_something_that_is_not_a_picture_is_turned_away_for_winners(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    not_a_picture = base64.b64encode(b"plain text, definitely not a picture").decode()
    response = await send_tournament_request(
        HTTPMethod.POST,
        "winners",
        auth_context,
        json={"year": 2024, "name": "Boeses Logo", "logo": not_a_picture},
    )
    assert response["detail"] == "The logo has to be a PNG or a JPEG"
