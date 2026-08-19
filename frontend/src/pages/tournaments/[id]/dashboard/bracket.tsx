import { Container, Grid, Stack, Title } from '@mantine/core';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { RoundsGridCols } from '@components/brackets/brackets';
import { DashboardFooter } from '@components/dashboard/footer';
import {
  DashboardNotPublic,
  DoubleHeader,
  getTournamentHeadTitle,
} from '@components/dashboard/layout';
import { NoContent } from '@components/no_content/empty_table_info';
import { BracketDisplaySettings } from '@components/utils/brackets';
import { responseIsValid, setTitle } from '@components/utils/util';
import { StageItemWithRounds, StageWithStageItems } from '@openapi';
import { getStagesLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';

// The bracket is only looked at here, so the display options are fixed and their setters
// are never called.
const READ_ONLY_DISPLAY_SETTINGS: BracketDisplaySettings = {
  matchVisibility: 'all',
  setMatchVisibility: () => {},
  teamNamesDisplay: 'team-names',
  setTeamNamesDisplay: () => {},
  showManualSchedulingOptions: 'false',
  setShowManualSchedulingOptions: () => {},
};

export default function DashboardBracketPage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  const swrStagesResponse = getStagesLive(tournamentValid ? tournamentDataFull.id : null);

  if (!tournamentValid) {
    return tournamentDataFull;
  }

  setTitle(getTournamentHeadTitle(tournamentDataFull));

  if (!tournamentDataFull.dashboard_public) {
    return (
      <>
        <DoubleHeader tournamentData={tournamentDataFull} />
        <DashboardNotPublic />
        <DashboardFooter />
      </>
    );
  }

  const stages: StageWithStageItems[] = responseIsValid(swrStagesResponse)
    ? (swrStagesResponse.data?.data ?? [])
    : [];
  const stageItems = stages.flatMap((stage) => stage.stage_items);
  const stageItemsWithMatches = stageItems.filter((stageItem: StageItemWithRounds) =>
    stageItem.rounds.some((round) => round.matches.length > 0),
  );

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Container fluid mt="1rem" px="md">
        {stageItemsWithMatches.length < 1 ? (
          <NoContent title={t('no_matches_title')} description="" icon={<AiOutlineHourglass />} />
        ) : (
          <Stack gap="xl">
            {stageItemsWithMatches.map((stageItem: StageItemWithRounds) => (
              <div key={stageItem.id}>
                <Title order={3} tt="uppercase" mb="sm">
                  {stageItem.name}
                </Title>
                <Grid grow>
                  <RoundsGridCols
                    stageItem={stageItem}
                    tournamentData={tournamentDataFull}
                    swrStagesResponse={swrStagesResponse}
                    swrUpcomingMatchesResponse={null}
                    readOnly
                    displaySettings={READ_ONLY_DISPLAY_SETTINGS}
                  />
                </Grid>
              </div>
            ))}
          </Stack>
        )}
      </Container>
      <DashboardFooter />
    </>
  );
}
