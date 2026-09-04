import { Container } from '@mantine/core';
import React from 'react';

import { DashboardFooter } from '@components/dashboard/footer';
import {
  DashboardNotPublic,
  DoubleHeader,
  getTournamentHeadTitle,
} from '@components/dashboard/layout';
import { TeamCards } from '@components/dashboard/team_cards';
import { TableSkeletonTwoColumns } from '@components/utils/skeletons';
import { setTitle } from '@components/utils/util';
import { getStagesLive, getTeamsLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { getTeamRecordLookup } from '@services/lookups';

export default function DashboardStandingsPage() {
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  const swrStagesResponse = getStagesLive(tournamentValid ? tournamentDataFull.id : null);
  const swrTeamsResponse = getTeamsLive(tournamentValid ? tournamentDataFull.id : null);

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

  if (swrStagesResponse.isLoading) {
    return <TableSkeletonTwoColumns />;
  }

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Container mt="1rem" px="0rem">
        <Container style={{ width: '100%' }} px="sm">
          {/* One list, not two: the standing is part of each team rather than a table
              underneath repeating all the same names. */}
          <TeamCards
            teams={swrTeamsResponse.data?.data?.teams ?? []}
            records={getTeamRecordLookup(swrStagesResponse)}
          />
        </Container>
      </Container>
      <DashboardFooter />
    </>
  );
}
