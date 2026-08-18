import { Container, Text } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DashboardFooter } from '@components/dashboard/footer';
import { DoubleHeader, getTournamentHeadTitle } from '@components/dashboard/layout';
import { NoContent } from '@components/no_content/empty_table_info';
import { setTitle } from '@components/utils/util';
import { getTournamentResponseByEndpointName } from '@services/dashboard';

export default function DashboardRulesPage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  if (!tournamentValid) {
    return tournamentDataFull;
  }

  setTitle(getTournamentHeadTitle(tournamentDataFull));

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Container mt="1rem" px="0rem">
        <Container style={{ width: '100%', maxWidth: '48rem' }} px="sm">
          {tournamentDataFull.rules ? (
            <Text style={{ whiteSpace: 'pre-wrap' }} size="md">
              {tournamentDataFull.rules}
            </Text>
          ) : (
            <NoContent title={t('no_rules_title')} description="" icon={<IconFileText />} />
          )}
        </Container>
      </Container>
      <DashboardFooter />
    </>
  );
}
