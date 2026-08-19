import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { TournamentEvent } from '@openapi';
import { createTournamentEvent, updateTournamentEvent } from '@services/tournament_event';

export function TournamentEventModal({
  tournamentId,
  event,
  opened,
  setOpened,
  onSaved,
}: {
  tournamentId: number;
  // null when a new event is added.
  event: TournamentEvent | null;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  onSaved: () => Promise<any>;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      name: event?.name ?? '',
      description: event?.description ?? '',
      start_time: event != null ? dayjs(event.start_time) : null,
      duration_minutes: event?.duration_minutes ?? 30,
      blocks_matches: event?.blocks_matches ?? true,
    },
    validate: {
      name: (value: string) => (value.length > 0 ? null : t('too_short_name_validation')),
      start_time: (value: any) => (value != null ? null : t('event_start_time_validation')),
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={event != null ? t('edit_event_title') : t('add_event_title')}
    >
      <form
        onSubmit={form.onSubmit(async (values) => {
          const fields = {
            name: values.name,
            description: values.description,
            start_time: values.start_time,
            duration_minutes: Number(values.duration_minutes),
            blocks_matches: values.blocks_matches,
          };
          if (event != null) {
            await updateTournamentEvent(tournamentId, event.id, fields);
          } else {
            await createTournamentEvent(tournamentId, fields);
          }
          await onSaved();
          setOpened(false);
        })}
      >
        <TextInput
          withAsterisk
          label={t('name_input_label')}
          placeholder={t('event_name_input_placeholder')}
          {...form.getInputProps('name')}
        />
        <Textarea
          label={t('event_description_label')}
          placeholder={t('event_description_placeholder')}
          autosize
          minRows={2}
          mt="sm"
          {...form.getInputProps('description')}
        />
        <Group grow mt="sm" align="start">
          <DateTimePicker
            withAsterisk
            label={t('event_start_time_label')}
            {...form.getInputProps('start_time')}
          />
          <NumberInput
            label={t('event_duration_label')}
            min={1}
            max={24 * 60}
            {...form.getInputProps('duration_minutes')}
          />
        </Group>
        <Checkbox
          mt="lg"
          label={t('event_blocks_matches_label')}
          {...form.getInputProps('blocks_matches', { type: 'checkbox' })}
        />
        <Text fz="sm" c="dimmed" mt={4}>
          {t('event_blocks_matches_description')}
        </Text>

        <Button fullWidth mt="lg" color="green" type="submit">
          {t('save_button')}
        </Button>
      </form>
    </Modal>
  );
}
