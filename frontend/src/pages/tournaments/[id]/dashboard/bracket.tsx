import { Container, Stack, Title } from '@mantine/core';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { BracketTree } from '@components/dashboard/bracket_tree';
import { DashboardFooter } from '@components/dashboard/footer';
import {
  DashboardNotPublic,
  DoubleHeader,
  getTournamentHeadTitle,
} from '@components/dashboard/layout';
import { NoContent } from '@components/no_content/empty_table_info';
import { responseIsValid, setTitle } from '@components/utils/util';
import { StageItemWithRounds, StageWithStageItems } from '@openapi';
import { getStagesLive, getTournamentEventsLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { getStageItemLookup } from '@services/lookups';

export default function DashboardBracketPage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  const swrStagesResponse = getStagesLive(tournamentValid ? tournamentDataFull.id : null);
  const swrEventsResponse = getTournamentEventsLive(tournamentValid ? tournamentDataFull.id : null);

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

  const responseValid = responseIsValid(swrStagesResponse);
  const stages: StageWithStageItems[] = responseValid ? (swrStagesResponse.data?.data ?? []) : [];
  const stageItemsLookup = responseValid ? getStageItemLookup(swrStagesResponse) : {};
  const stageItems = stages
    .flatMap((stage) => stage.stage_items)
    .filter((stageItem: StageItemWithRounds) =>
      stageItem.rounds.some((round) => round.matches.length > 0),
    );

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Container fluid mt="1rem" px={{ base: "xs", sm: "md" }}>
        {stageItems.length < 1 ? (
          <NoContent title={t('no_matches_title')} description="" icon={<AiOutlineHourglass />} />
        ) : (
          <Stack gap="xl">
            {stageItems.map((stageItem: StageItemWithRounds) => (
              <div key={stageItem.id}>
                <Title order={3} tt="uppercase" mb="sm" ta="center">
                  {stageItem.name}
                </Title>
                <BracketTree
                  stageItem={stageItem}
                  stageItemsLookup={stageItemsLookup}
                  events={swrEventsResponse.data?.data ?? []}
                />
              </div>
            ))}
          </Stack>
        )}
      </Container>
      <DashboardFooter />
    </>
  );
}
