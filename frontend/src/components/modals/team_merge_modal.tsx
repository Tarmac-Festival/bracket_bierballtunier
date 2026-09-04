import { Button, Modal, Select, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconGitMerge } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { FullTeamWithPlayers, TeamsWithPlayersResponse } from '@openapi';
import { requestSucceeded } from '@services/adapter';
import { mergeTeam } from '@services/team';

export function teamOptions(teams: FullTeamWithPlayers[], memberWord: string) {
  return teams.map((team) => ({
    value: `${team.id}`,
    label: `${team.name} (${team.players.length} ${memberWord})`,
  }));
}

export default function TeamMergeModal({
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

  const form = useForm({
    initialValues: {
      target_team_id: null as string | null,
      target_team_name: '',
    },
    validate: {
      target_team_id: (value) => (value != null ? null : t('merge_team_target_validation')),
      target_team_name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
    },
  });

  if (otherTeams.length < 1) {
    return null;
  }

  // Pre-fill the name with the team that stays, so it only has to be touched on purpose.
  const onTargetChange = (value: string | null) => {
    form.setFieldValue('target_team_id', value);
    const target = otherTeams.find((other) => `${other.id}` === value);
    form.setFieldValue('target_team_name', target != null ? target.name : '');
  };

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t('merge_team_title')}>
        <form
          onSubmit={form.onSubmit(async (values) => {
            const result = await mergeTeam(
              tournament_id,
              team.id,
              parseInt(values.target_team_id as string, 10),
              values.target_team_name,
            );
            if (requestSucceeded(result)) {
              await swrTeamsResponse.mutate();
              setOpened(false);
            }
          })}
        >
          <Text fz="sm" mb="md">
            {t('merge_team_description')} &quot;{team.name}&quot; ({team.players.length}{' '}
            {t('members_table_header')})
          </Text>
          <Select
            withAsterisk
            data={teamOptions(otherTeams, t('members_table_header'))}
            label={t('merge_team_target_label')}
            placeholder={t('merge_team_target_placeholder')}
            searchable
            limit={25}
            value={form.values.target_team_id}
            error={form.errors.target_team_id}
            onChange={onTargetChange}
          />
          <TextInput
            withAsterisk
            label={t('merge_team_name_label')}
            mt="md"
            disabled={form.values.target_team_id == null}
            {...form.getInputProps('target_team_name')}
          />
          <Button fullWidth mt="lg" color="orange" type="submit">
            {t('merge_team_confirm_button')}
          </Button>
        </form>
      </Modal>

      <Button
        color="gray"
        size="xs"
        style={{ marginRight: 10 }}
        onClick={() => setOpened(true)}
        leftSection={<IconGitMerge size={20} />}
      >
        {t('merge_team_button')}
      </Button>
    </>
  );
}
