from bracket.models.db.team import FullTeamWithPlayers
from bracket.models.db.util import StageWithStageItems

# The contact person a team names when it registers is there so the organisers can phone
# somebody who did not turn up. The dashboard is public, so those two fields are kept out
# of everything an anonymous visitor can read.
_CONTACT_HIDDEN = {"contact_name": None, "contact_phone": None}


def hide_contact_details_in_teams(teams: list[FullTeamWithPlayers]) -> list[FullTeamWithPlayers]:
    return [team.model_copy(update=_CONTACT_HIDDEN) for team in teams]


def hide_contact_details_in_stages(
    stages: list[StageWithStageItems],
) -> list[StageWithStageItems]:
    """
    Teams travel along inside the stages as well: once per stage item input, and again on
    both sides of every match.
    """
    for stage in stages:
        for stage_item in stage.stage_items:
            for stage_item_input in stage_item.inputs:
                _hide_on_input(stage_item_input)

            for round_ in stage_item.rounds:
                for match in round_.matches:
                    _hide_on_input(match.stage_item_input1)
                    _hide_on_input(match.stage_item_input2)

    return stages


def _hide_on_input(stage_item_input: object | None) -> None:
    team = getattr(stage_item_input, "team", None)
    if team is not None:
        team.contact_name = None
        team.contact_phone = None
