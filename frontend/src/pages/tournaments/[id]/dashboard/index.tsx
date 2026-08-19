import { Alert, Badge, Card, Center, Flex, Grid, Group, Stack, Text } from '@mantine/core';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DashboardFooter } from '@components/dashboard/footer';
import {
  DashboardNotPublic,
  DoubleHeader,
  getTournamentHeadTitle,
} from '@components/dashboard/layout';
import { RegistrationBanner } from '@components/dashboard/registration_banner';
import { NoContent } from '@components/no_content/empty_table_info';
import {
  Time,
  compareDateTime,
  formatDayAndTime,
  formatTime,
  spansMultipleDays,
} from '@components/utils/datetime';
import { formatMatchInput1, formatMatchInput2 } from '@components/utils/match';
import { Translator } from '@components/utils/types';
import { responseIsValid, setTitle } from '@components/utils/util';
import { TournamentEvent } from '@openapi';
import { getCourtsLive, getStagesLive, getTournamentEventsLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { getMatchLookup, getStageItemLookup, stringToColour } from '@services/lookups';

function ScheduleRow({
  data,
  stageItemsLookup,
  matchesLookup,
}: {
  data: any;
  stageItemsLookup: any;
  matchesLookup: any;
}) {
  const { t } = useTranslation();
  const winColor = '#2a8f37';
  const drawColor = '#656565';
  const loseColor = '#af4034';
  const team1_color =
    data.match.stage_item_input1_score > data.match.stage_item_input2_score
      ? winColor
      : data.match.stage_item_input1_score === data.match.stage_item_input2_score
        ? drawColor
        : loseColor;
  const team2_color =
    data.match.stage_item_input2_score > data.match.stage_item_input1_score
      ? winColor
      : data.match.stage_item_input1_score === data.match.stage_item_input2_score
        ? drawColor
        : loseColor;

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      mt="md"
      pt="0rem"
      style={{ borderLeft: '4px solid var(--tarmac-green)' }}
    >
      <Card.Section withBorder>
        <Group justify="space-between" gap="xs" px="sm" py="0.6rem" wrap="wrap">
          <Text fw={800}>{data.match.court.name}</Text>
          <Text fw={800}>
            {data.match.start_time != null ? <Time datetime={data.match.start_time} /> : null}
          </Text>
          <Badge color={stringToColour(`${data.stageItem.id}`)} variant="outline" size="md">
            {data.stageItem.name}
          </Badge>
        </Group>
      </Card.Section>
      <Stack pt="sm">
        <Grid>
          <Grid.Col span="auto" pb="0rem">
            <Text fw={600} fz="lg">
              {formatMatchInput1(t, stageItemsLookup, matchesLookup, data.match)}
            </Text>
          </Grid.Col>
          <Grid.Col span="content" pb="0rem">
            <div
              style={{
                backgroundColor: team1_color,
                borderRadius: '0.5rem',
                width: '3rem',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.35rem',
              }}
            >
              <Center>{data.match.stage_item_input1_score}</Center>
            </div>
          </Grid.Col>
        </Grid>
        <Grid mb="0rem">
          <Grid.Col span="auto" pb="0rem">
            <Text fw={600} fz="lg">
              {formatMatchInput2(t, stageItemsLookup, matchesLookup, data.match)}
            </Text>
          </Grid.Col>
          <Grid.Col span="content" pb="0rem">
            <div
              style={{
                backgroundColor: team2_color,
                borderRadius: '0.5rem',
                width: '3rem',
                color: 'white',
                fontWeight: 800,
                fontSize: '1.35rem',
              }}
            >
              <Center>{data.match.stage_item_input2_score}</Center>
            </div>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}

function EventRow({ event }: { event: TournamentEvent }) {
  const { t } = useTranslation();
  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      mt="md"
      pt="0rem"
      style={{ borderLeft: '4px solid var(--tarmac-purple-light)' }}
    >
      <Card.Section withBorder>
        <Group justify="space-between" gap="xs" px="sm" py="0.6rem" wrap="wrap">
          <Text fw={800} tt="uppercase" c="tarmac.3">
            {t('event_label')}
          </Text>
          <Text fw={800}>
            <Time datetime={event.start_time} />
          </Text>
          <Badge color="tarmac.3" variant="outline" size="md">
            {t('event_duration_summary', { minutes: event.duration_minutes })}
          </Badge>
        </Group>
      </Card.Section>
      <Stack pt="sm" gap="0.25rem">
        <Text fw={700} fz="lg">
          {event.name}
        </Text>
        {event.location ? (
          <Text fz="sm" fw={600} c="tarmac.3">
            📍 {event.location}
          </Text>
        ) : null}
        {event.description ? (
          <Text fz="sm" c="dimmed">
            {event.description}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

type ScheduleEntry = {
  startTime: string;
  // Decides the order within one time slot, so the courts stay in order. An event has no
  // court and therefore comes first.
  court: string;
  match: any | null;
  event: TournamentEvent | null;
};

export function Schedule({
  t,
  stageItemsLookup,
  matchesLookup,
  events,
}: {
  t: Translator;
  stageItemsLookup: any;
  matchesLookup: any;
  events: TournamentEvent[];
}) {
  const matches: any[] = Object.values(matchesLookup);
  const entries: ScheduleEntry[] = [
    ...matches
      .filter((data: any) => data.match.start_time != null)
      .map((data: any) => ({
        startTime: data.match.start_time as string,
        court: (data.match.court?.name ?? '') as string,
        match: data,
        event: null,
      })),
    ...events.map((event) => ({
      startTime: event.start_time,
      court: '',
      match: null,
      event,
    })),
  ].sort(
    (e1, e2) =>
      compareDateTime(e1.startTime, e2.startTime) ||
      // Numeric, so that "Spielfeld 10" doesn't sort before "Spielfeld 2".
      e1.court.localeCompare(e2.court, undefined, { numeric: true }),
  );

  // Over several days a bare "20:30" says nothing about which day it is, so the headings
  // carry the date as well.
  const multipleDays = spansMultipleDays(entries.map((entry) => entry.startTime));
  const headingFor = (startTime: string) =>
    multipleDays ? formatDayAndTime(startTime) : formatTime(startTime);

  const rows: React.JSX.Element[] = [];

  for (let c = 0; c < entries.length; c += 1) {
    const entry = entries[c];
    const heading = headingFor(entry.startTime);

    if (c < 1 || heading !== headingFor(entries[c - 1].startTime)) {
      rows.push(
        <Center mt="xl" key={`time-${c}`}>
          <Text
            size="xl"
            fw={800}
            tt="uppercase"
            c="tarmacGreen.4"
            style={{ letterSpacing: '2px' }}
          >
            {heading}
          </Text>
        </Center>,
      );
    }

    rows.push(
      entry.event != null ? (
        <EventRow key={`event-${entry.event.id}`} event={entry.event} />
      ) : (
        <ScheduleRow
          key={entry.match.match.id}
          data={entry.match}
          stageItemsLookup={stageItemsLookup}
          matchesLookup={matchesLookup}
        />
      ),
    );
  }

  if (rows.length < 1) {
    return <NoContent title={t('no_matches_title')} description="" icon={<AiOutlineHourglass />} />;
  }

  const noItemsAlert =
    matchesLookup.length < 1 ? (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title={t('no_matches_title')}
        color="gray"
        radius="md"
      >
        {t('drop_match_alert_title')}
      </Alert>
    ) : null;

  return (
    <Group wrap="nowrap" align="top" style={{ width: '100%' }}>
      <div style={{ width: '100%' }}>
        {rows}
        {noItemsAlert}
      </div>
    </Group>
  );
}
export default function DashboardSchedulePage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);

  const swrStagesResponse = getStagesLive(tournamentValid ? tournamentDataFull.id : null);
  const swrCourtsResponse = getCourtsLive(tournamentValid ? tournamentDataFull.id : null);
  const swrEventsResponse = getTournamentEventsLive(tournamentValid ? tournamentDataFull.id : null);

  if (!tournamentValid) {
    return tournamentDataFull;
  }

  setTitle(getTournamentHeadTitle(tournamentDataFull));

  // Reachable via the registration link even when the dashboard itself is not public.
  if (!tournamentDataFull.dashboard_public) {
    return (
      <>
        <DoubleHeader tournamentData={tournamentDataFull} />
        <Center>
          <Group style={{ maxWidth: '48rem', width: '100%' }} px="1rem">
            <RegistrationBanner tournament={tournamentDataFull} />
            <DashboardNotPublic />
          </Group>
        </Center>
        <DashboardFooter />
      </>
    );
  }

  const stageItemsLookup = responseIsValid(swrStagesResponse)
    ? getStageItemLookup(swrStagesResponse)
    : [];
  const matchesLookup = responseIsValid(swrStagesResponse) ? getMatchLookup(swrStagesResponse) : [];

  // TODO: show loading icon.
  if (!responseIsValid(swrStagesResponse)) return null;
  if (!responseIsValid(swrCourtsResponse)) return null;

  return (
    <>
      <DoubleHeader tournamentData={tournamentDataFull} />
      <Center>
        <Group style={{ maxWidth: '48rem', width: '100%' }} px="1rem">
          <RegistrationBanner tournament={tournamentDataFull} />
          <Schedule
            t={t}
            matchesLookup={matchesLookup}
            stageItemsLookup={stageItemsLookup}
            events={swrEventsResponse.data?.data ?? []}
          />
        </Group>
      </Center>
      <DashboardFooter />
    </>
  );
}
