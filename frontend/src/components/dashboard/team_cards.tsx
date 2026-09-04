import { Accordion, Box, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RichText } from '@components/dashboard/rules_content';
import { WinDistribution } from '@components/info/player_statistics';
import { TeamLogo } from '@components/info/team_logo';
import { WinDistributionTitle } from '@components/tables/players';
import { FullTeamWithPlayers } from '@openapi';
import { TeamRecord } from '@services/lookups';

const NOTHING_PLAYED: TeamRecord = { wins: 0, draws: 0, losses: 0, points: 0 };

/** Best first: points, then wins, then the fewest defeats. Ties stay ties. */
function compareRecords(r1: TeamRecord, r2: TeamRecord) {
  return r2.points - r1.points || r2.wins - r1.wins || r1.losses - r2.losses;
}

/** Whether opening this card would show anything at all. */
function hasContent(team: FullTeamWithPlayers) {
  return (team.description ?? '').trim() !== '' || team.players.length > 0;
}

/**
 * Every team with its crest, how it is doing, who plays for it and whatever it wrote about
 * itself. The teams that wrote nothing still get a card, so the page reads as a full field
 * rather than a list of the talkative ones — and the standing lives here rather than in a
 * second list underneath saying the same names again.
 */
export function TeamCards({
  teams,
  records,
}: {
  teams: FullTeamWithPlayers[];
  records: { [teamId: number]: TeamRecord };
}) {
  const { t } = useTranslation();
  // Until somebody chooses, the order follows whether there is anything to rank yet.
  const [chosenOrder, setChosenOrder] = useState<string | null>(null);

  const recordOf = (team: FullTeamWithPlayers) => records[team.id] ?? NOTHING_PLAYED;
  const played = teams.some((team) => {
    const record = recordOf(team);
    return record.wins + record.draws + record.losses > 0;
  });
  const order = chosenOrder ?? (played ? 'rank' : 'name');

  const byName = [...teams].sort((t1, t2) =>
    t1.name.localeCompare(t2.name, undefined, { numeric: true }),
  );
  const byRank = [...byName].sort((t1, t2) => compareRecords(recordOf(t1), recordOf(t2)));

  // Teams that are level share a position, so four teams on one win each read as four
  // firsts instead of a first, a second, a third and a fourth.
  const positions = new Map<number, number>();
  byRank.forEach((team, index) => {
    const above = byRank[index - 1];
    const level = above != null && compareRecords(recordOf(above), recordOf(team)) === 0;
    positions.set(team.id, level ? (positions.get(above.id) ?? index + 1) : index + 1);
  });

  const sorted = order === 'rank' ? byRank : byName;

  return (
    <>
      {played ? (
        <Group justify="space-between" mb="sm" gap="xs">
          <Text fz="sm" c="dimmed">
            <WinDistributionTitle />
          </Text>
          <SegmentedControl
            size="xs"
            value={order}
            onChange={setChosenOrder}
            data={[
              { label: t('sort_teams_by_rank'), value: 'rank' },
              { label: t('sort_teams_by_name'), value: 'name' },
            ]}
          />
        </Group>
      ) : null}

      <Accordion variant="separated" radius="md" multiple>
        {sorted.map((team) => {
          const record = recordOf(team);
          // Teams entered by hand have neither a text nor a squad yet. Those cards stay
          // shut rather than opening onto nothing.
          const hasSomethingToSay = hasContent(team);
          return (
            <Accordion.Item key={team.id} value={`${team.id}`}>
              <Accordion.Control
                disabled={!hasSomethingToSay}
                chevron={hasSomethingToSay ? undefined : <Box />}
                // Shut, but not greyed out: there is nothing wrong with the team, it has
                // just not written anything yet.
                style={hasSomethingToSay ? undefined : { cursor: 'default', opacity: 1 }}
              >
                <Group gap="sm" wrap="nowrap">
                  {order === 'rank' ? (
                    <Text fw={700} c="dimmed" ta="right" style={{ width: '1.4rem', flexShrink: 0 }}>
                      {positions.get(team.id)}
                    </Text>
                  ) : null}
                  <TeamLogo team={team} size={34} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} fz="lg" truncate="end">
                      {team.name}
                    </Text>
                    {team.players.length > 0 ? (
                      <Text fz="xs" c="dimmed">
                        {t('team_member_count', { count: team.players.length })}
                      </Text>
                    ) : null}
                  </Box>
                  {played ? (
                    <Box style={{ width: '5rem', flexShrink: 0 }}>
                      <WinDistribution
                        wins={record.wins}
                        draws={record.draws}
                        losses={record.losses}
                        fontSizeInPixels={11}
                      />
                    </Box>
                  ) : null}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {team.description ? <RichText text={team.description} /> : null}
                  <Text fz="sm" c="dimmed">
                    {team.players.map((player) => player.name).join(' · ')}
                  </Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </>
  );
}
