from bracket.database import database
from bracket.models.db.tournament_winner import TournamentWinner
from bracket.utils.id_types import TournamentId, TournamentWinnerId


async def sql_get_winners_of_tournament(tournament_id: TournamentId) -> list[TournamentWinner]:
    query = """
        SELECT *
        FROM tournament_winners
        WHERE tournament_winners.tournament_id = :tournament_id
        ORDER BY year DESC, id DESC
        """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [TournamentWinner.model_validate(dict(x._mapping)) for x in result]


async def sql_get_winner(
    tournament_id: TournamentId, winner_id: TournamentWinnerId
) -> TournamentWinner | None:
    query = """
        SELECT *
        FROM tournament_winners
        WHERE tournament_winners.tournament_id = :tournament_id
        AND tournament_winners.id = :winner_id
        """
    result = await database.fetch_one(
        query=query, values={"tournament_id": tournament_id, "winner_id": winner_id}
    )
    return TournamentWinner.model_validate(dict(result._mapping)) if result is not None else None


async def sql_update_winner(
    tournament_id: TournamentId,
    winner_id: TournamentWinnerId,
    year: int,
    name: str,
    description: str | None,
    logo_path: str | None,
    easter_egg: bool,
    easter_egg_image_path: str | None,
) -> None:
    query = """
        UPDATE tournament_winners
        SET year = :year,
            name = :name,
            description = :description,
            logo_path = :logo_path,
            easter_egg = :easter_egg,
            easter_egg_image_path = :easter_egg_image_path
        WHERE tournament_winners.tournament_id = :tournament_id
        AND tournament_winners.id = :winner_id
        """
    await database.execute(
        query=query,
        values={
            "tournament_id": tournament_id,
            "winner_id": winner_id,
            "year": year,
            "name": name,
            "description": description,
            "logo_path": logo_path,
            "easter_egg": easter_egg,
            "easter_egg_image_path": easter_egg_image_path,
        },
    )


async def sql_delete_winner(tournament_id: TournamentId, winner_id: TournamentWinnerId) -> None:
    query = """
        DELETE FROM tournament_winners
        WHERE id = :winner_id AND tournament_id = :tournament_id
        """
    await database.execute(
        query=query, values={"winner_id": winner_id, "tournament_id": tournament_id}
    )


async def sql_delete_winners_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM tournament_winners WHERE tournament_id = :tournament_id"
    await database.execute(query=query, values={"tournament_id": tournament_id})
