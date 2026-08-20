from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc
from starlette import status

from bracket.config import config
from bracket.database import database
from bracket.logic.logo_upload import save_uploaded_logo
from bracket.models.db.tournament import Tournament
from bracket.models.db.tournament_winner import (
    TournamentWinner,
    TournamentWinnerBody,
    TournamentWinnerInsertable,
)
from bracket.models.db.user import UserPublic
from bracket.routes.auth import (
    user_authenticated_for_tournament,
    user_authenticated_or_public_dashboard,
)
from bracket.routes.models import (
    SingleTournamentWinnerResponse,
    SuccessResponse,
    TournamentWinnersResponse,
)
from bracket.routes.util import disallow_archived_tournament
from bracket.schema import tournament_winners
from bracket.sql.tournament_winners import (
    sql_delete_winner,
    sql_get_winner,
    sql_get_winners_of_tournament,
    sql_update_winner,
)
from bracket.utils.id_types import TournamentId, TournamentWinnerId
from bracket.utils.types import assert_some

router = APIRouter(prefix=config.api_prefix)


async def _get_winner_or_404(
    tournament_id: TournamentId, winner_id: TournamentWinnerId
) -> TournamentWinner:
    winner = await sql_get_winner(tournament_id, winner_id)
    if winner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Winner not found")
    return winner


async def _picture_path_for(sent: str | None, existing: str | None, folder: str) -> str | None:
    """
    A picture is only replaced when a new one was picked; leaving the field alone keeps the
    one that is already there.
    """
    if sent is None:
        return existing

    try:
        return await save_uploaded_logo(sent, folder)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/tournaments/{tournament_id}/winners", response_model=TournamentWinnersResponse)
async def get_winners(
    tournament_id: TournamentId,
    _: UserPublic = Depends(user_authenticated_or_public_dashboard),
) -> TournamentWinnersResponse:
    return TournamentWinnersResponse(data=await sql_get_winners_of_tournament(tournament_id))


@router.post("/tournaments/{tournament_id}/winners", response_model=SingleTournamentWinnerResponse)
async def create_winner(
    tournament_id: TournamentId,
    winner_body: TournamentWinnerBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SingleTournamentWinnerResponse:
    last_record_id = await database.execute(
        query=tournament_winners.insert(),
        values=TournamentWinnerInsertable(
            created=datetime_utc.now(),
            tournament_id=tournament_id,
            year=winner_body.year,
            name=winner_body.name,
            description=winner_body.description,
            logo_path=await _picture_path_for(winner_body.logo, None, "winner-logos"),
            easter_egg=winner_body.easter_egg,
            easter_egg_image_path=await _picture_path_for(
                winner_body.easter_egg_image, None, "easter-egg-images"
            ),
        ).model_dump(),
    )
    return SingleTournamentWinnerResponse(
        data=assert_some(await sql_get_winner(tournament_id, TournamentWinnerId(last_record_id)))
    )


@router.put(
    "/tournaments/{tournament_id}/winners/{winner_id}",
    response_model=SingleTournamentWinnerResponse,
)
async def update_winner(
    tournament_id: TournamentId,
    winner_id: TournamentWinnerId,
    winner_body: TournamentWinnerBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SingleTournamentWinnerResponse:
    existing = await _get_winner_or_404(tournament_id, winner_id)
    await sql_update_winner(
        tournament_id,
        winner_id,
        winner_body.year,
        winner_body.name,
        winner_body.description,
        await _picture_path_for(winner_body.logo, existing.logo_path, "winner-logos"),
        winner_body.easter_egg,
        await _picture_path_for(
            winner_body.easter_egg_image, existing.easter_egg_image_path, "easter-egg-images"
        ),
    )
    return SingleTournamentWinnerResponse(
        data=assert_some(await sql_get_winner(tournament_id, winner_id))
    )


@router.delete("/tournaments/{tournament_id}/winners/{winner_id}", response_model=SuccessResponse)
async def delete_winner(
    tournament_id: TournamentId,
    winner_id: TournamentWinnerId,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
) -> SuccessResponse:
    await _get_winner_or_404(tournament_id, winner_id)
    await sql_delete_winner(tournament_id, winner_id)
    return SuccessResponse()
