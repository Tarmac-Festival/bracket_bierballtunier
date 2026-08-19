import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
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

export type AnchorOption = { value: string; label: string };

// What decides when the event starts.
type Timing = 'fixed' | 'round' | 'match' | 'beforeRound';

function initialTiming(event: TournamentEvent | null): Timing {
  if (event?.after_match_id != null) return 'match';
  if (event?.after_round_id != null) return 'round';
  if (event?.before_round_id != null) return 'beforeRound';
  return 'fixed';
}

export function TournamentEventModal({
  tournamentId,
  event,
  roundOptions,
  matchOptions,
  opened,
  setOpened,
  onSaved,
}: {
  tournamentId: number;
  // null when a new event is added.
  event: TournamentEvent | null;
  roundOptions: AnchorOption[];
  matchOptions: AnchorOption[];
  opened: boolean;
  setOpened: (opened: boolean) => void;
  onSaved: () => Promise<any>;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      name: event?.name ?? '',
      description: event?.description ?? '',
      location: event?.location ?? '',
      timing: initialTiming(event),
      start_time: event != null ? dayjs(event.start_time) : null,
      after_round_id: event?.after_round_id != null ? `${event.after_round_id}` : null,
      after_match_id: event?.after_match_id != null ? `${event.after_match_id}` : null,
      before_round_id: event?.before_round_id != null ? `${event.before_round_id}` : null,
      duration_minutes: event?.duration_minutes ?? 30,
      blocks_matches: event?.blocks_matches ?? true,
    },
    validate: {
      name: (value: string) => (value.length > 0 ? null : t('too_short_name_validation')),
      start_time: (value: any, values: any) =>
        values.timing !== 'fixed' || value != null ? null : t('event_start_time_validation'),
      after_round_id: (value: any, values: any) =>
        values.timing !== 'round' || value != null ? null : t('event_after_round_validation'),
      after_match_id: (value: any, values: any) =>
        values.timing !== 'match' || value != null ? null : t('event_after_match_validation'),
      before_round_id: (value: any, values: any) =>
        values.timing !== 'beforeRound' || value != null ? null : t('event_after_round_validation'),
    },
  });

  const timing: Timing = form.values.timing;

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
            location: values.location,
            // Only the chosen one is sent; the others tell the API to forget them.
            start_time: values.timing === 'fixed' ? values.start_time : null,
            after_round_id: values.timing === 'round' ? Number(values.after_round_id) : null,
            after_match_id: values.timing === 'match' ? Number(values.after_match_id) : null,
            before_round_id:
              values.timing === 'beforeRound' ? Number(values.before_round_id) : null,
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
        <TextInput
          label={t('event_location_label')}
          placeholder={t('event_location_placeholder')}
          mt="sm"
          {...form.getInputProps('location')}
        />
        <Textarea
          label={t('event_description_label')}
          placeholder={t('event_description_placeholder')}
          autosize
          minRows={2}
          mt="sm"
          {...form.getInputProps('description')}
        />

        <Select
          label={t('event_timing_label')}
          mt="lg"
          allowDeselect={false}
          data={[
            { value: 'fixed', label: t('event_timing_fixed') },
            { value: 'round', label: t('event_timing_after_round') },
            { value: 'match', label: t('event_timing_after_match') },
            { value: 'beforeRound', label: t('event_timing_before_round') },
          ]}
          {...form.getInputProps('timing')}
        />

        <Group grow mt="sm" align="start">
          {timing === 'fixed' ? (
            <DateTimePicker
              withAsterisk
              label={t('event_start_time_label')}
              {...form.getInputProps('start_time')}
            />
          ) : null}
          {timing === 'round' ? (
            <Select
              withAsterisk
              searchable
              label={t('event_after_round_label')}
              placeholder={t('event_after_round_placeholder')}
              data={roundOptions}
              {...form.getInputProps('after_round_id')}
            />
          ) : null}
          {timing === 'beforeRound' ? (
            <Select
              withAsterisk
              searchable
              label={t('event_before_round_label')}
              placeholder={t('event_after_round_placeholder')}
              data={roundOptions}
              {...form.getInputProps('before_round_id')}
            />
          ) : null}
          {timing === 'match' ? (
            <Select
              withAsterisk
              searchable
              label={t('event_after_match_label')}
              placeholder={t('event_after_match_placeholder')}
              data={matchOptions}
              {...form.getInputProps('after_match_id')}
            />
          ) : null}
          <NumberInput
            label={t('event_duration_label')}
            min={1}
            max={24 * 60}
            {...form.getInputProps('duration_minutes')}
          />
        </Group>
        {timing !== 'fixed' ? (
          <Text fz="sm" c="dimmed" mt={4}>
            {t('event_timing_derived_description')}
          </Text>
        ) : null}
        {timing === 'beforeRound' ? (
          <Text fz="sm" c="dimmed" mt={4}>
            {t('event_before_round_blocking_description')}
          </Text>
        ) : null}

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
