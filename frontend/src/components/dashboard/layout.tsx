import {
  Alert,
  Box,
  Center,
  Container,
  Group,
  Image,
  Skeleton,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { useLocation } from 'react-router';

import PreloadLink from '@components/utils/link';
import { registrationIsOpen } from '@components/utils/tournament';
import { getBaseURL } from '@components/utils/util';
import { Tournament } from '@openapi';
import { getBaseApiUrl } from '@services/adapter';
import classes from './layout.module.css';

export function TournamentQRCode({ tournamentDataFull }: { tournamentDataFull: Tournament }) {
  if (tournamentDataFull == null) {
    return null;
  }
  return (
    <div
      style={{
        width: '100%',
        background: 'white',
        marginTop: '2rem',
        maxWidth: '400px',
        height: 'auto',
        borderRadius: '16px',
        alignSelf: 'end',
      }}
    >
      <Center>
        <QRCode
          style={{ margin: '24px' }}
          // @ts-ignore
          size="auto"
          value={`${getBaseURL()}/tournaments/${tournamentDataFull.dashboard_endpoint}/dashboard`}
        />
      </Center>
    </div>
  );
}

export function TournamentLogo({ tournamentDataFull }: { tournamentDataFull: Tournament }) {
  if (tournamentDataFull == null) {
    return <Skeleton height={150} radius="xl" mb="xl" />;
  }
  return tournamentDataFull.logo_path ? (
    <>
      <Image
        radius="lg"
        mt="1rem"
        alt="Logo of the tournament"
        src={`${getBaseApiUrl()}/static/tournament-logos/${tournamentDataFull.logo_path}`}
        style={{ maxWidth: '400px' }}
      />
    </>
  ) : null;
}

export function DashboardNotPublic() {
  const { t } = useTranslation();
  return (
    <Container mt="1rem" px="sm">
      <Alert icon={<IconAlertCircle size={16} />} color="gray" radius="md">
        {t('dashboard_not_public_message')}
      </Alert>
    </Container>
  );
}

export function getTournamentHeadTitle(tournamentDataFull: Tournament) {
  return tournamentDataFull !== null ? tournamentDataFull.name : 'Tarmac Bierballturnier';
}

export function TournamentTitle({ tournamentDataFull }: { tournamentDataFull: Tournament }) {
  return tournamentDataFull != null ? (
    <Title>{tournamentDataFull.name}</Title>
  ) : (
    <Skeleton height={50} radius="lg" mb="xl" />
  );
}

export function DoubleHeader({ tournamentData }: { tournamentData: Tournament }) {
  const { t } = useTranslation();
  const navigate = useLocation();
  const endpoint = tournamentData.dashboard_endpoint || '';
  const pathName = navigate.pathname.replace('[id]', endpoint).replace(/\/+$/, '');

  const mainLinks = [
    ...(tournamentData.dashboard_public
      ? [
          { link: `/tournaments/${endpoint}/dashboard`, label: t('dashboard_tab_matches') },
          { link: `/tournaments/${endpoint}/dashboard/bracket`, label: t('dashboard_tab_bracket') },
          {
            link: `/tournaments/${endpoint}/dashboard/standings`,
            label: t('dashboard_tab_standings'),
          },
        ]
      : []),
    ...(tournamentData.dashboard_public && tournamentData.rules
      ? [{ link: `/tournaments/${endpoint}/dashboard/rules`, label: t('dashboard_tab_rules') }]
      : []),
    ...(registrationIsOpen(tournamentData)
      ? [
          {
            link: `/tournaments/${endpoint}/dashboard/register`,
            label: t('dashboard_tab_register'),
          },
        ]
      : []),
  ];

  const mainItems = mainLinks.map((item) => (
    <PreloadLink
      href={item.link}
      key={item.label}
      className={classes.mainLink}
      data-active={item.link === pathName || undefined}
    >
      {item.label}
    </PreloadLink>
  ));

  return (
    <header className={classes.header}>
      <div className={classes.stripe} />
      <Container className={`${classes.inner} ${classes.titleBar}`}>
        <UnstyledButton component={PreloadLink} href={`/tournaments/${endpoint}/dashboard`}>
          <Title lineClamp={1} className={classes.tournamentTitle}>
            {tournamentData.name}
          </Title>
        </UnstyledButton>
        <Box className={classes.links}>
          <Group gap={0} className={classes.mainLinks}>
            {mainItems}
          </Group>
        </Box>
      </Container>
    </header>
  );
}
