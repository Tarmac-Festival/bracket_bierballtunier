import { Button, Modal, Select, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconGitMerge } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { FullTeamWithPlayers, TeamsWithPlayersResponse } from '@openapi';
import { requestSucceeded } from '@services/adapter';
import { mergeTeam } from '@services/team';

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
      target_team_id: null,
    },
    validate: {
      target_team_id: (value) => (value != null ? null : t('merge_team_target_validation')),
    },
  });

  if (otherTeams.length < 1) {
    return null;
  }

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t('merge_team_title')}>
        <form
          onSubmit={form.onSubmit(async (values) => {
            const result = await mergeTeam(
              tournament_id,
              team.id,
              parseInt(values.target_team_id as unknown as string, 10),
            );
            if (requestSucceeded(result)) {
              await swrTeamsResponse.mutate();
              setOpened(false);
            }
          })}
        >
          <Text fz="sm" mb="md">
            {t('merge_team_description')} &quot;{team.name}&quot;
          </Text>
          <Select
            withAsterisk
            data={otherTeams.map((t2) => ({ value: `${t2.id}`, label: t2.name }))}
            label={t('merge_team_target_label')}
            placeholder={t('merge_team_target_placeholder')}
            searchable
            limit={25}
            {...form.getInputProps('target_team_id')}
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
