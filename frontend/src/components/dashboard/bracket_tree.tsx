import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { formatTime } from '@components/utils/datetime';
import { formatStageItemInput } from '@components/utils/stage_item_input';
import { StageItemWithRounds } from '@openapi';

const BOX_WIDTH = 230;
const BOX_HEIGHT = 78;
const COLUMN_GAP = 56;
const SIBLING_GAP = 18;
const HEADER_HEIGHT = 34;

type PositionedMatch = {
  id: number;
  centerY: number;
  column: number;
  label1: string;
  label2: string;
  score1: number;
  score2: number;
  subtitle: string;
  feeders: number[];
};

/**
 * Lays the matches out as a real bracket: every match sits vertically centred between the
 * two matches that feed into it, so the connecting lines fan out to the left.
 */
function layOutRounds(
  stageItem: StageItemWithRounds,
  stageItemsLookup: any,
  emptyLabel: string,
): { matches: PositionedMatch[]; columns: number; height: number } {
  const rounds = [...stageItem.rounds]
    .sort((r1, r2) => r1.name.localeCompare(r2.name, undefined, { numeric: true }))
    .filter((round) => round.matches.length > 0);

  const positions = new Map<number, number>();
  const result: PositionedMatch[] = [];
  let height = 0;

  rounds.forEach((round, column) => {
    round.matches.forEach((match: any, index: number) => {
      const feeders = [
        match.stage_item_input1_winner_from_match_id,
        match.stage_item_input2_winner_from_match_id,
      ].filter((id): id is number => id != null && positions.has(id));

      // Centre on the feeders when they are known, otherwise stack the matches evenly.
      const centerY =
        feeders.length > 0
          ? feeders.reduce((sum, id) => sum + (positions.get(id) as number), 0) / feeders.length
          : index * (BOX_HEIGHT + SIBLING_GAP) + BOX_HEIGHT / 2;

      positions.set(match.id, centerY);
      height = Math.max(height, centerY + BOX_HEIGHT / 2);

      const named1 = formatStageItemInput(match.stage_item_input1, stageItemsLookup);
      const named2 = formatStageItemInput(match.stage_item_input2, stageItemsLookup);

      result.push({
        id: match.id,
        centerY,
        column,
        // The line coming in from the left already says where an unknown team comes from,
        // so there is no need to spell out "winner of match ..." here.
        label1: named1 ?? (match.stage_item_input1_winner_from_match_id != null ? '—' : emptyLabel),
        label2: named2 ?? (match.stage_item_input2_winner_from_match_id != null ? '—' : emptyLabel),
        score1: match.stage_item_input1_score,
        score2: match.stage_item_input2_score,
        subtitle: [match.court?.name, match.start_time ? formatTime(match.start_time) : null]
          .filter(Boolean)
          .join(' · '),
        feeders,
      });
    });
  });

  return { matches: result, columns: rounds.length, height };
}

function Connectors({ matches }: { matches: PositionedMatch[] }) {
  const byId = new Map(matches.map((match) => [match.id, match]));

  return (
    <>
      {matches.flatMap((match) =>
        match.feeders.map((feederId) => {
          const feeder = byId.get(feederId);
          if (feeder == null) return null;

          const fromX = feeder.column * (BOX_WIDTH + COLUMN_GAP) + BOX_WIDTH;
          const toX = match.column * (BOX_WIDTH + COLUMN_GAP);
          const middleX = (fromX + toX) / 2;

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
        left: match.column * (BOX_WIDTH + COLUMN_GAP),
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

export function BracketTree({
  stageItem,
  stageItemsLookup,
}: {
  stageItem: StageItemWithRounds;
  stageItemsLookup: any;
}) {
  const { t } = useTranslation();
  const { matches, columns, height } = layOutRounds(stageItem, stageItemsLookup, t('empty_slot'));

  if (matches.length < 1) {
    return null;
  }

  const width = columns * BOX_WIDTH + (columns - 1) * COLUMN_GAP;
  const roundLabels = [...stageItem.rounds]
    .sort((r1, r2) => r1.name.localeCompare(r2.name, undefined, { numeric: true }))
    .filter((round) => round.matches.length > 0);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div style={{ position: 'relative', width, height: height + HEADER_HEIGHT, minWidth: width }}>
        {roundLabels.map((round, column) => (
          <Text
            key={round.id}
            fw={700}
            tt="uppercase"
            fz="sm"
            style={{
              position: 'absolute',
              left: column * (BOX_WIDTH + COLUMN_GAP),
              top: 0,
              width: BOX_WIDTH,
              textAlign: 'center',
            }}
          >
            {round.name}
          </Text>
        ))}

        <div style={{ position: 'absolute', top: HEADER_HEIGHT, left: 0, width, height }}>
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
      </div>
    </div>
  );
}
