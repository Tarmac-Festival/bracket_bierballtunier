import csv
import os
from decimal import Decimal
from uuid import uuid4

import aiofiles
import aiofiles.os
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from heliclockter import datetime_utc

from bracket.config import config
from bracket.database import database
from bracket.logic.ranking.statistics import START_ELO
from bracket.logic.subscriptions import check_requirement
from bracket.logic.teams import get_team_logo_path
from bracket.models.db.player import PlayerBody, PlayerToInsert
from bracket.models.db.team import (
    FullTeamWithPlayers,
    Team,
    TeamBody,
    TeamInsertable,
    TeamMergeBody,
    TeamMultiBody,
    TeamRegistrationBody,
)
from bracket.models.db.tournament import Tournament
from bracket.models.db.user import UserPublic
from bracket.routes.auth import (
    user_authenticated_for_tournament,
    user_authenticated_or_public_dashboard,
)
from bracket.routes.models import (
    PaginatedTeams,
    SingleTeamResponse,
    SuccessResponse,
    TeamsWithPlayersResponse,
)
from bracket.routes.util import (
    disallow_archived_tournament,
    team_dependency,
    team_with_players_dependency,
)
from bracket.schema import players, players_x_teams, teams
from bracket.sql.players import get_all_players_in_tournament, insert_player
from bracket.sql.teams import (
    get_team_by_id,
    get_team_count,
    get_teams_with_members,
    sql_delete_team,
)
from bracket.sql.validation import check_foreign_keys_belong_to_tournament
from bracket.utils.db import fetch_one_parsed
from bracket.utils.errors import ForeignKey, check_foreign_key_violation
from bracket.utils.id_types import PlayerId, TeamId, TournamentId
from bracket.utils.logging import logger
from bracket.utils.pagination import PaginationTeams
from bracket.utils.types import assert_some

router = APIRouter(prefix=config.api_prefix)


async def update_team_members(
    team_id: TeamId, tournament_id: TournamentId, player_ids: set[PlayerId]
) -> None:
    [team] = await get_teams_with_members(tournament_id, team_id=team_id)

    # Add members to the team
    for player_id in player_ids:
        if player_id not in team.player_ids:
            await database.execute(
                query=players_x_teams.insert(),
                values={"team_id": team_id, "player_id": player_id},
            )

    # Remove old members from the team
    await database.execute(
        query=players_x_teams.delete().where(
            (players_x_teams.c.player_id.not_in(player_ids))  # type: ignore[attr-defined]
            & (players_x_teams.c.team_id == team_id)
        ),
    )


@router.get("/tournaments/{tournament_id}/teams", response_model=TeamsWithPlayersResponse)
async def get_teams(
    tournament_id: TournamentId,
    pagination: PaginationTeams = Depends(),
    _: UserPublic = Depends(user_authenticated_or_public_dashboard),
) -> TeamsWithPlayersResponse:
    return TeamsWithPlayersResponse(
        data=PaginatedTeams(
            teams=await get_teams_with_members(tournament_id, pagination=pagination),
            count=await get_team_count(tournament_id),
        )
    )


@router.put("/tournaments/{tournament_id}/teams/{team_id}", response_model=SingleTeamResponse)
async def update_team_by_id(
    tournament_id: TournamentId,
    team_body: TeamBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
    team: Team = Depends(team_dependency),
) -> SingleTeamResponse:
    await check_foreign_keys_belong_to_tournament(team_body, tournament_id)

    await database.execute(
        query=teams.update().where(
            (teams.c.id == team.id) & (teams.c.tournament_id == tournament_id)
        ),
        values=team_body.model_dump(exclude={"player_ids"}),
    )
    await update_team_members(team.id, tournament_id, team_body.player_ids)

    return SingleTeamResponse(
        data=assert_some(
            await fetch_one_parsed(
                database,
                Team,
                teams.select().where(
                    (teams.c.id == team.id) & (teams.c.tournament_id == tournament_id)
                ),
            )
        )
    )


@router.post("/tournaments/{tournament_id}/teams/{team_id}/logo", response_model=SingleTeamResponse)
async def update_team_logo(
    tournament_id: TournamentId,
    file: UploadFile | None = None,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
    team: Team = Depends(team_dependency),
) -> SingleTeamResponse:
    old_logo_path = await get_team_logo_path(tournament_id, team.id)
    filename: str | None = None
    new_logo_path: str | None = None

    if file:
        assert file.filename is not None
        extension = os.path.splitext(file.filename)[1]
        assert extension in (".png", ".jpg", ".jpeg")

        filename = f"{uuid4()}{extension}"
        new_logo_path = f"static/team-logos/{filename}" if file is not None else None

        if new_logo_path:
            await aiofiles.os.makedirs("static/team-logos", exist_ok=True)
            async with aiofiles.open(new_logo_path, "wb") as f:
                await f.write(await file.read())

    if old_logo_path is not None and old_logo_path != new_logo_path:
        try:
            await aiofiles.os.remove(old_logo_path)
        except Exception as exc:
            logger.error(f"Could not remove logo that should still exist: {old_logo_path}\n{exc}")

    await database.execute(
        teams.update().where(teams.c.id == team.id),
        values={"logo_path": filename},
    )
    return SingleTeamResponse(data=assert_some(await get_team_by_id(team.id, tournament_id)))


@router.delete("/tournaments/{tournament_id}/teams/{team_id}", response_model=SuccessResponse)
async def delete_team(
    tournament_id: TournamentId,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    __: Tournament = Depends(disallow_archived_tournament),
    team: FullTeamWithPlayers = Depends(team_with_players_dependency),
) -> SuccessResponse:
    with check_foreign_key_violation(
        {
            ForeignKey.stage_item_inputs_team_id_fkey,
            ForeignKey.matches_stage_item_input1_id_fkey,
            ForeignKey.matches_stage_item_input2_id_fkey,
        }
    ):
        await sql_delete_team(tournament_id, team.id)

    return SuccessResponse()


@router.post(
    "/tournaments/{tournament_id}/teams/{team_id}/merge", response_model=SuccessResponse
)
async def merge_team(
    tournament_id: TournamentId,
    body: TeamMergeBody,
    _: UserPublic = Depends(user_authenticated_for_tournament),
    tournament: Tournament = Depends(disallow_archived_tournament),
    team: FullTeamWithPlayers = Depends(team_with_players_dependency),
) -> SuccessResponse:
    if body.target_team_id == team.id:
        raise HTTPException(status_code=400, detail="Can't merge a team into itself")

    target_teams = await get_teams_with_members(tournament_id, team_id=body.target_team_id)
    if len(target_teams) < 1:
        raise HTTPException(status_code=404, detail="Could not find the target team")
    [target_team] = target_teams

    combined_size = len(team.players) + len(target_team.players)
    if combined_size > tournament.team_size_max:
        raise HTTPException(
            status_code=400,
            detail=f"Merging would result in a team of {combined_size} members, which "
            f"exceeds the maximum team size of {tournament.team_size_max}",
        )

    async with database.transaction():
        for player_id in team.player_ids:
            await database.execute(
                query=players_x_teams.insert(),
                values={"team_id": body.target_team_id, "player_id": player_id},
            )
        await sql_delete_team(tournament_id, team.id)

    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/teams", response_model=SingleTeamResponse)
async def create_team(
    team_to_insert: TeamBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(user_authenticated_for_tournament),
    _: Tournament = Depends(disallow_archived_tournament),
) -> SingleTeamResponse:
    await check_foreign_keys_belong_to_tournament(team_to_insert, tournament_id)

    existing_teams = await get_teams_with_members(tournament_id)
    check_requirement(existing_teams, user, "max_teams")

    last_record_id = await database.execute(
        query=teams.insert(),
        values=TeamInsertable(
            **team_to_insert.model_dump(exclude={"player_ids"}),
            created=datetime_utc.now(),
            tournament_id=tournament_id,
        ).model_dump(),
    )
    await update_team_members(last_record_id, tournament_id, team_to_insert.player_ids)

    team_result = await get_team_by_id(last_record_id, tournament_id)
    assert team_result is not None
    return SingleTeamResponse(data=team_result)


@router.post("/tournaments/{tournament_id}/teams_multi", response_model=SuccessResponse)
async def create_multiple_teams(
    team_body: TeamMultiBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(user_authenticated_for_tournament),
    _: Tournament = Depends(disallow_archived_tournament),
) -> SuccessResponse:
    reader = list(csv.reader(team_body.names.split("\n"), delimiter=","))
    teams_and_players = [
        (row[0], [p for p in row[1:] if len(p) > 0] if len(row) > 1 else [])
        for row in reader
        if len(row) > 0
    ]
    players = [player for row in teams_and_players for player in row[1]]

    existing_teams = await get_teams_with_members(tournament_id)
    existing_players = await get_all_players_in_tournament(tournament_id)

    check_requirement(existing_teams, user, "max_teams", additions=len(reader))
    check_requirement(existing_players, user, "max_players", additions=len(players))

    async with database.transaction():
        for team_name, players in teams_and_players:
            await database.execute(
                query=teams.insert(),
                values=TeamInsertable(
                    name=team_name,
                    active=team_body.active,
                    created=datetime_utc.now(),
                    tournament_id=tournament_id,
                ).model_dump(),
            )
            for player in players:
                player_body = PlayerBody(name=player, active=team_body.active)
                await insert_player(player_body, tournament_id)

    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/register", response_model=SingleTeamResponse)
async def register_team(
    body: TeamRegistrationBody,
    tournament_id: TournamentId,
    tournament: Tournament = Depends(disallow_archived_tournament),
) -> SingleTeamResponse:
    if not tournament.registration_enabled:
        raise HTTPException(
            status_code=403, detail="Registration is not open for this tournament"
        )

    if (
        tournament.registration_deadline is not None
        and datetime_utc.now() > tournament.registration_deadline
    ):
        raise HTTPException(status_code=403, detail="The registration deadline has passed")

    team_size = len(body.player_names)
    if not (tournament.team_size_min <= team_size <= tournament.team_size_max):
        raise HTTPException(
            status_code=400,
            detail=f"A team must have between {tournament.team_size_min} and "
            f"{tournament.team_size_max} members",
        )

    async with database.transaction():
        team_id = await database.execute(
            query=teams.insert(),
            values=TeamInsertable(
                name=body.name,
                active=True,
                created=datetime_utc.now(),
                tournament_id=tournament_id,
            ).model_dump(),
        )

        for player_name in body.player_names:
            player_id = await database.execute(
                query=players.insert(),
                values=PlayerToInsert(
                    name=player_name,
                    active=True,
                    created=datetime_utc.now(),
                    tournament_id=tournament_id,
                    elo_score=START_ELO,
                    swiss_score=Decimal("0.0"),
                ).model_dump(),
            )
            await database.execute(
                query=players_x_teams.insert(),
                values={"team_id": team_id, "player_id": player_id},
            )

    team_result = await get_team_by_id(team_id, tournament_id)
    assert team_result is not None
    return SingleTeamResponse(data=team_result)
