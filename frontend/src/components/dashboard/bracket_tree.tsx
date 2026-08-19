import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import {
  formatDay,
  formatDayAndTime,
  formatTime,
  spansMultipleDays,
} from '@components/utils/datetime';
import { formatStageItemInput } from '@components/utils/stage_item_input';
import { StageItemWithRounds, TournamentEvent } from '@openapi';

const BOX_WIDTH = 230;
const BOX_HEIGHT = 78;
const COLUMN_GAP = 56;
const SIBLING_GAP = 18;
const ROUND_HEADER_HEIGHT = 34;
const DAY_LINE_HEIGHT = 20;
const EVENT_WIDTH = 46;

type PositionedMatch = {
  id: number;
  centerY: number;
  // Left edge in the bracket, since an event band between two rounds makes the columns
  // unevenly spaced.
  x: number;
  label1: string;
  label2: string;
  score1: number;
  score2: number;
  subtitle: string;
  feeders: number[];
};

type Column =
  | { kind: 'round'; key: string; x: number; name: string; day: string | null }
  | { kind: 'event'; key: string; x: number; event: TournamentEvent; label: string };

/**
 * Lays the matches out as a real bracket: every match sits vertically centred between the
 * two matches that feed into it, so the connecting lines fan out to the left.
 */
function layOutRounds(
  stageItem: StageItemWithRounds,
  stageItemsLookup: any,
  events: TournamentEvent[],
  emptyLabel: string,
): { matches: PositionedMatch[]; columns: Column[]; width: number; height: number } {
  const rounds = [...stageItem.rounds]
    .sort((r1, r2) => r1.name.localeCompare(r2.name, undefined, { numeric: true }))
    .filter((round) => round.matches.length > 0);

  // Over several days the time on its own is ambiguous. A round is normally played within
  // one day, so the date belongs above the column rather than in every single box.
  const multipleDays = spansMultipleDays(
    rounds.flatMap((round) => round.matches).map((match: any) => match.start_time),
  );
  const roundStartTimes = rounds.map((round) =>
    round.matches
      .map((match: any) => match.start_time)
      .filter((startTime: string | null): startTime is string => startTime != null)
      .sort(),
  );
  const roundColumns = rounds.map((round, index) => {
    const startTimes = roundStartTimes[index];
    const withinOneDay = !spansMultipleDays(startTimes);
    return {
      kind: 'round' as const,
      key: `round-${round.id}`,
      name: round.name,
      day: multipleDays && withinOneDay && startTimes.length > 0 ? formatDay(startTimes[0]) : null,
    };
  });

  // An event goes after every round that has already started when it begins, so a halftime
  // show lands between the rounds it separates and an award ceremony after the final. On a
  // tie the event comes first: it is what pushes the round after it back.
  const columnsWithoutX = [
    ...roundColumns.map((column, index) => ({ column, order: index, tieBreak: 0 })),
    ...events.map((event) => ({
      column: {
        kind: 'event' as const,
        key: `event-${event.id}`,
        event,
        label: `${event.name} · ${multipleDays ? formatDayAndTime(event.start_time) : formatTime(event.start_time)}`,
      },
      order: roundStartTimes.filter(
        (startTimes) => startTimes.length > 0 && startTimes[0] <= event.start_time,
      ).length,
      tieBreak: -1,
    })),
  ].sort((c1, c2) => c1.order - c2.order || c1.tieBreak - c2.tieBreak);

  let nextX = 0;
  const columns: Column[] = columnsWithoutX.map(({ column }) => {
    const x = nextX;
    nextX += (column.kind === 'event' ? EVENT_WIDTH : BOX_WIDTH) + COLUMN_GAP;
    return { ...column, x };
  });
  const width = Math.max(nextX - COLUMN_GAP, 0);
  const roundX = columns.filter((column) => column.kind === 'round').map((column) => column.x);

  const matchById = new Map<number, any>();
  rounds.forEach((round) => {
    round.matches.forEach((match: any) => matchById.set(match.id, match));
  });

  const feedersOf = (match: any): number[] =>
    [
      match.stage_item_input1_winner_from_match_id,
      match.stage_item_input2_winner_from_match_id,
    ].filter((id): id is number => id != null && matchById.has(id));

  const isFeeder = new Set<number>();
  matchById.forEach((match) => feedersOf(match).forEach((id) => isFeeder.add(id)));

  const positions = new Map<number, number>();
  let nextSlot = 0;

  /**
   * Walking back from the final is what decides the vertical order. Stacking the first
   * round in the order the API returns it put unrelated matches next to each other, which
   * made the lines cross and let boxes of a later round land on top of one another.
   */
  const place = (match: any): number => {
    const placed = positions.get(match.id);
    if (placed != null) {
      return placed;
    }

    const feeders = feedersOf(match);
    let centerY;

    if (feeders.length > 0) {
      const feederPositions = feeders.map((id) => place(matchById.get(id)));
      centerY = feederPositions.reduce((sum, y) => sum + y, 0) / feederPositions.length;
    } else {
      centerY = nextSlot * (BOX_HEIGHT + SIBLING_GAP) + BOX_HEIGHT / 2;
      nextSlot += 1;
    }

    positions.set(match.id, centerY);
    return centerY;
  };

  // The final first, so its half of the bracket gets the top slots, then anything the walk
  // did not reach because this stage item is not one clean tree.
  [...rounds]
    .reverse()
    .flatMap((round) => round.matches)
    .filter((match: any) => !isFeeder.has(match.id))
    .forEach((match: any) => place(match));
  rounds.flatMap((round) => round.matches).forEach((match: any) => place(match));

  const result: PositionedMatch[] = [];
  let height = 0;

  rounds.forEach((round, index) => {
    // Only a round that is split over two days needs the date down in the boxes.
    const formatStart =
      roundColumns[index].day == null && multipleDays ? formatDayAndTime : formatTime;

    round.matches.forEach((match: any) => {
      const centerY = positions.get(match.id) as number;
      height = Math.max(height, centerY + BOX_HEIGHT / 2);

      const named1 = formatStageItemInput(match.stage_item_input1, stageItemsLookup);
      const named2 = formatStageItemInput(match.stage_item_input2, stageItemsLookup);

      result.push({
        id: match.id,
        centerY,
        x: roundX[index],
        // The line coming in from the left already says where an unknown team comes from,
        // so there is no need to spell out "winner of match ..." here.
        label1: named1 ?? (match.stage_item_input1_winner_from_match_id != null ? '—' : emptyLabel),
        label2: named2 ?? (match.stage_item_input2_winner_from_match_id != null ? '—' : emptyLabel),
        score1: match.stage_item_input1_score,
        score2: match.stage_item_input2_score,
        subtitle: [match.court?.name, match.start_time ? formatStart(match.start_time) : null]
          .filter(Boolean)
          .join(' · '),
        feeders: feedersOf(match),
      });
    });
  });

  return { matches: result, columns, width, height };
}

function Connectors({ matches }: { matches: PositionedMatch[] }) {
  const byId = new Map(matches.map((match) => [match.id, match]));

  return (
    <>
      {matches.flatMap((match) =>
        match.feeders.map((feederId) => {
          const feeder = byId.get(feederId);
          if (feeder == null) return null;

          const fromX = feeder.x + BOX_WIDTH;
          const toX = match.x;
          const middleX = toX - COLUMN_GAP / 2;

          return (
            <path
              key={`${feederId}-${match.id}`}
              d={`M ${fromX} ${feeder.centerY} H ${middleX} V ${match.centerY} H ${toX}`}
              fill="none"
              stroke="var(--tarmac-purple-light)"
              strokeWidth={2}
            />
          );
        }),
      )}
    </>
  );
}

function MatchBox({ match }: { match: PositionedMatch }) {
  const decided = match.score1 !== match.score2;
  const rowStyle = (won: boolean) => ({
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.25rem 0.5rem',
    fontWeight: won ? 700 : 400,
    color: won ? 'var(--tarmac-green)' : undefined,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: match.x,
        top: match.centerY - BOX_HEIGHT / 2,
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
        borderRadius: 8,
        border: '1px solid var(--mantine-color-dark-4)',
        background: 'var(--mantine-color-dark-6)',
        overflow: 'hidden',
      }}
    >
      {match.subtitle ? (
        <Text fz="xs" c="dimmed" px="0.5rem" pt="0.15rem" truncate>
          {match.subtitle}
        </Text>
      ) : null}
      <div style={rowStyle(decided && match.score1 > match.score2)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.label1}
        </span>
        <span>{match.score1}</span>
      </div>
      <div style={rowStyle(decided && match.score2 > match.score1)}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.label2}
        </span>
        <span>{match.score2}</span>
      </div>
    </div>
  );
}

function EventBand({ column, height }: { column: Column & { kind: 'event' }; height: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: column.x,
        top: 0,
        width: EVENT_WIDTH,
        height,
        borderRadius: 8,
        border: '1px solid var(--tarmac-purple-light)',
        background: 'rgba(69, 11, 111, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      title={[column.event.name, column.event.location, column.event.description]
        .filter(Boolean)
        .join(' · ')}
    >
      <Text
        fz="xs"
        fw={700}
        tt="uppercase"
        style={{
          // Bottom to top, so a long name still fits in the narrow band.
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          whiteSpace: 'nowrap',
          letterSpacing: '1px',
        }}
      >
        {column.label}
        {column.event.location ? ` · ${column.event.location}` : ''}
      </Text>
    </div>
  );
}

export function BracketTree({
  stageItem,
  stageItemsLookup,
  events,
}: {
  stageItem: StageItemWithRounds;
  stageItemsLookup: any;
  events: TournamentEvent[];
}) {
  const { t } = useTranslation();
  const { matches, columns, width, height } = layOutRounds(
    stageItem,
    stageItemsLookup,
    events,
    t('empty_slot'),
  );

  if (matches.length < 1) {
    return null;
  }

  const headerHeight =
    ROUND_HEADER_HEIGHT +
    (columns.some((column) => column.kind === 'round' && column.day != null) ? DAY_LINE_HEIGHT : 0);

  return (
    // Centred while it fits, scrollable once the bracket outgrows the screen.
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', display: 'flex' }}>
      <div
        style={{
          position: 'relative',
          width,
          height: height + headerHeight,
          minWidth: width,
          margin: '0 auto',
        }}
      >
        {columns.map((column) =>
          column.kind === 'round' ? (
            <div
              key={column.key}
              style={{
                position: 'absolute',
                left: column.x,
                top: 0,
                width: BOX_WIDTH,
                textAlign: 'center',
              }}
            >
              <Text fw={700} tt="uppercase" fz="sm">
                {column.name}
              </Text>
              {column.day != null ? (
                <Text fz="xs" c="dimmed">
                  {column.day}
                </Text>
              ) : null}
            </div>
          ) : null,
        )}

        <div style={{ position: 'absolute', top: headerHeight, left: 0, width, height }}>
          <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <Connectors matches={matches} />
          </svg>
          {matches.map((match) => (
            <MatchBox key={match.id} match={match} />
          ))}
        </div>

        {/* Last, so the band covers the lines running past it instead of being crossed. */}
        {columns.map((column) =>
          column.kind === 'event' ? (
            <EventBand key={column.key} column={column} height={height + headerHeight} />
          ) : null,
        )}
      </div>
    </div>
  );
}
