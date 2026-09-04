import { Button, Modal, Select, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowsSplit } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { FullTeamWithPlayers, TeamsWithPlayersResponse } from '@openapi';
import { requestSucceeded } from '@services/adapter';
import { splitTeam } from '@services/team';
import { teamOptions } from './team_merge_modal';

export default function TeamSplitModal({
  tournament_id,
  team,
  otherTeams,
  swrTeamsResponse,
}: {
  tournament_id: number;
  team: FullTeamWithPlayers;
  otherTeams: FullTeamWithPlayers[];
  swrTeamsResponse: SWRResponse<TeamsWithPlayersResponse>;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  const form = useForm<{ assignments: { [playerId: string]: string | null } }>({
    initialValues: {
      assignments: Object.fromEntries(team.players.map((player) => [`${player.id}`, null])),
    },
    validate: {
      assignments: (value) =>
        Object.values(value).every((target) => target != null)
          ? null
          : t('split_team_assignment_validation'),
    },
  });

  if (otherTeams.length < 1 || team.players.length < 1) {
    return null;
  }

  const options = teamOptions(otherTeams, t('members_table_header'));

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t('split_team_title')}>
        <form
          onSubmit={form.onSubmit(async (values) => {
            const assignments = Object.fromEntries(
              Object.entries(values.assignments).map(([playerId, targetId]) => [
                playerId,
                parseInt(targetId as string, 10),
              ]),
            );
            const result = await splitTeam(tournament_id, team.id, assignments);
            if (requestSucceeded(result)) {
              await swrTeamsResponse.mutate();
              setOpened(false);
            }
          })}
        >
          <Text fz="sm" mb="md">
            {t('split_team_description')} &quot;{team.name}&quot;
          </Text>
          <Stack gap="sm">
            {team.players.map((player) => (
              <Select
                key={player.id}
                withAsterisk
                data={options}
                label={player.name}
                placeholder={t('merge_team_target_placeholder')}
                searchable
                limit={25}
                {...form.getInputProps(`assignments.${player.id}`)}
              />
            ))}
          </Stack>
          {form.errors.assignments != null ? (
            <Text fz="sm" c="red" mt="sm">
              {form.errors.assignments}
            </Text>
          ) : null}
          <Button fullWidth mt="lg" color="orange" type="submit">
            {t('split_team_confirm_button')}
          </Button>
        </form>
      </Modal>

      <Button
        color="gray"
        size="xs"
        style={{ marginRight: 10 }}
        onClick={() => setOpened(true)}
        leftSection={<IconArrowsSplit size={20} />}
      >
        {t('split_team_button')}
      </Button>
    </>
  );
}
