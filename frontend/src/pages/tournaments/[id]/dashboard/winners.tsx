import { Badge, Card, Center, Container, Group, Image, Stack, Text } from '@mantine/core';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DashboardFooter } from '@components/dashboard/footer';
import {
  DashboardNotPublic,
  DoubleHeader,
  getTournamentHeadTitle,
} from '@components/dashboard/layout';
import { RichText } from '@components/dashboard/rules_content';
import { NoContent } from '@components/no_content/empty_table_info';
import { setTitle } from '@components/utils/util';
import { TournamentWinner } from '@openapi';
import { getBaseApiUrl, getTournamentWinnersLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';

function WinnerCard({ winner }: { winner: TournamentWinner }) {
  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{ borderLeft: '4px solid var(--tarmac-green)' }}
    >
      <Group gap="md" wrap="nowrap" align="start">
        {winner.logo_path != null ? (
          <Image
            src={`${getBaseApiUrl()}/static/winner-logos/${winner.logo_path}`}
            alt=""
            h={64}
            w="auto"
            maw={140}
            fit="contain"
          />
        ) : null}
        <Stack gap="0.35rem" style={{ minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap">
            <Badge color="tarmacGreen.4" variant="outline" size="lg">
              {winner.year}
            </Badge>
            <Text fw={700} fz="lg">
              {winner.name}
            </Text>
          </Group>
          {winner.description ? <RichText text={winner.description} /> : null}
        </Stack>
      </Group>
    </Card>
  );
}

export default function DashboardWinnersPage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  const swrWinnersResponse = getTournamentWinnersLive(
    tournamentValid ? tournamentDataFull.id : null,
  );

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

  const winners = swrWinnersResponse.data?.data ?? [];

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Center>
        <Container style={{ maxWidth: '48rem', width: '100%' }} px="1rem" mt="1rem">
          {winners.length < 1 ? (
            <NoContent title={t('no_winners_title')} description="" icon={<AiOutlineHourglass />} />
          ) : (
            <Stack gap="md">
              {winners.map((winner) => (
                <WinnerCard key={winner.id} winner={winner} />
              ))}
            </Stack>
          )}
        </Container>
      </Center>
      <DashboardFooter />
    </>
  );
}
