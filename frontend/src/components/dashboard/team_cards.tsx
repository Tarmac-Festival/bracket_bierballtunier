import { Accordion, Badge, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { RichText } from '@components/dashboard/rules_content';
import { TeamLogo } from '@components/info/team_logo';
import { FullTeamWithPlayers } from '@openapi';

/**
 * Every team with its crest, who plays for it and whatever it wrote about itself. The teams
 * that wrote nothing still get a card, so the page reads as a full field rather than a list
 * of the talkative ones.
 */
export function TeamCards({ teams }: { teams: FullTeamWithPlayers[] }) {
  const { t } = useTranslation();
  const sorted = [...teams].sort((t1, t2) =>
    t1.name.localeCompare(t2.name, undefined, { numeric: true }),
  );

  return (
    <Accordion variant="separated" radius="md" multiple>
      {sorted.map((team) => (
        <Accordion.Item key={team.id} value={`${team.id}`}>
          <Accordion.Control>
            <Group gap="sm" wrap="nowrap">
              <TeamLogo team={team} size={34} />
              <Text fw={700} fz="lg">
                {team.name}
              </Text>
              {team.players.length > 0 ? (
                <Badge variant="outline" color="tarmac.3">
                  {t('team_member_count', { count: team.players.length })}
                </Badge>
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
      ))}
    </Accordion>
  );
}
