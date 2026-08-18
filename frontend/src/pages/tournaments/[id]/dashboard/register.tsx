import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DashboardFooter } from '@components/dashboard/footer';
import { DoubleHeader, getTournamentHeadTitle } from '@components/dashboard/layout';
import { RichText } from '@components/dashboard/rules_content';
import { registrationIsOpen } from '@components/utils/tournament';
import { setTitle } from '@components/utils/util';
import { Tournament } from '@openapi';
import { requestSucceeded } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { registerTeam } from '@services/team';

function RegistrationForm({
  tournamentId,
  minSize,
  maxSize,
  onSuccess,
}: {
  tournamentId: number;
  minSize: number;
  maxSize: number;
  onSuccess: (name: string) => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      team_name: '',
      player_names: Array.from({ length: minSize }, () => ''),
    },
    validate: {
      team_name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
      player_names: (value: string[]) =>
        value.every((name) => name.trim().length > 0)
          ? null
          : t('player_name_required_validation'),
    },
  });

  const addPlayer = () => {
    if (form.values.player_names.length < maxSize) {
      form.insertListItem('player_names', '');
    }
  };

  const removePlayer = (index: number) => {
    if (form.values.player_names.length > minSize) {
      form.removeListItem('player_names', index);
    }
  };

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        const result = await registerTeam(tournamentId, values.team_name, values.player_names);
        if (requestSucceeded(result)) {
          onSuccess(values.team_name);
        }
      })}
    >
      <Title order={3} mb="md">
        {t('register_team_title')}
      </Title>
      <TextInput
        withAsterisk
        label={t('name_input_label')}
        placeholder={t('team_name_input_placeholder')}
        {...form.getInputProps('team_name')}
      />

      <Text fz="sm" mt="lg">
        {t('team_members_label')} ({minSize}
        {minSize !== maxSize ? `-${maxSize}` : ''})
      </Text>
      <Stack gap="xs" mt="xs">
        {form.values.player_names.map((_: string, index: number) => (
          // eslint-disable-next-line react/no-array-index-key
          <Group key={index} wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              placeholder={t('player_name_input_placeholder')}
              {...form.getInputProps(`player_names.${index}`)}
            />
            {form.values.player_names.length > minSize ? (
              <ActionIcon color="red" variant="subtle" onClick={() => removePlayer(index)}>
                <IconTrash size={18} />
              </ActionIcon>
            ) : null}
          </Group>
        ))}
      </Stack>

      {form.values.player_names.length < maxSize ? (
        <Button variant="light" mt="sm" leftSection={<IconPlus size={16} />} onClick={addPlayer}>
          {t('add_player_button')}
        </Button>
      ) : null}

      <Button fullWidth mt="lg" type="submit">
        {t('register_button')}
      </Button>
    </form>
  );
}

export default function DashboardRegisterPage() {
  const { t } = useTranslation();
  const tournamentDataFull = getTournamentResponseByEndpointName();
  const tournamentValid = !React.isValidElement(tournamentDataFull);
  const [success, setSuccess] = useState<string | null>(null);

  if (!tournamentValid) {
    return tournamentDataFull;
  }

  const tournament: Tournament = tournamentDataFull;
  setTitle(getTournamentHeadTitle(tournament));

  const registrationOpen = registrationIsOpen(tournament);

  return (
    <>
      <DoubleHeader tournamentData={tournament} />
      <Container mt="1rem" px="0rem">
        <Container style={{ width: '100%', maxWidth: '32rem' }} px="sm">
          {tournament.registration_info ? (
            <Paper withBorder radius="md" p="md" mb="lg">
              <RichText text={tournament.registration_info} />
            </Paper>
          ) : null}

          {!registrationOpen ? (
            <Alert icon={<IconAlertCircle size={16} />} color="gray" radius="md">
              {tournament.registration_enabled
                ? t('registration_closed_deadline_message')
                : t('registration_closed_message')}
            </Alert>
          ) : success != null ? (
            <Alert
              icon={<IconCheck size={16} />}
              color="tarmacGreen.4"
              radius="md"
              title={t('registration_success_title')}
            >
              {t('registration_success_message')} &quot;{success}&quot;
            </Alert>
          ) : (
            <RegistrationForm
              tournamentId={tournament.id}
              minSize={tournament.team_size_min}
              maxSize={tournament.team_size_max}
              onSuccess={setSuccess}
            />
          )}
        </Container>
      </Container>
      <DashboardFooter />
    </>
  );
}
