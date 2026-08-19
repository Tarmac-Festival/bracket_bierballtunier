import { ActionIcon, Badge, Button, Card, Group, Menu, Stack, Text, Title } from '@mantine/core';
import { IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { TournamentEventModal } from '@components/modals/tournament_event_modal';
import { formatDayAndTime, formatTime } from '@components/utils/datetime';
import { TournamentEvent, TournamentEventsResponse } from '@openapi';
import { deleteTournamentEvent } from '@services/tournament_event';

function endOf(event: TournamentEvent) {
  return new Date(
    new Date(event.start_time).getTime() + event.duration_minutes * 60_000,
  ).toISOString();
}

export function EventsPanel({
  tournamentId,
  swrEventsResponse,
  onChanged,
}: {
  tournamentId: number;
  swrEventsResponse: SWRResponse<TournamentEventsResponse>;
  // The schedule shifts when a blocking event changes, so the matches are reloaded too.
  onChanged: () => Promise<any>;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<TournamentEvent | null>(null);

  const events = swrEventsResponse.data?.data ?? [];

  const reload = async () => {
    await swrEventsResponse.mutate();
    await onChanged();
  };

  const open = (event: TournamentEvent | null) => {
    setEditing(event);
    setOpened(true);
  };

  return (
    <>
      {opened ? (
        <TournamentEventModal
          // Remounted per event so the form starts from the right values.
          key={editing?.id ?? 'new'}
          tournamentId={tournamentId}
          event={editing}
          opened={opened}
          setOpened={setOpened}
          onSaved={reload}
        />
      ) : null}

      <Group justify="space-between" mt="xl" mb="sm">
        <Title order={3}>{t('events_title')}</Title>
        <Button
          variant="outline"
          color="green"
          size="xs"
          leftSection={<IconPlus size={18} />}
          onClick={() => open(null)}
        >
          {t('add_event_title')}
        </Button>
      </Group>

      {events.length < 1 ? (
        <Text c="dimmed" fz="sm">
          {t('no_events_description')}
        </Text>
      ) : (
        <Stack gap="xs">
          {events.map((event) => (
            <Card key={event.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" wrap="nowrap" align="start">
                <div>
                  <Text fw={600}>{event.name}</Text>
                  <Text fz="sm" c="dimmed">
                    {formatDayAndTime(event.start_time)} – {formatTime(endOf(event))} (
                    {t('event_duration_summary', { minutes: event.duration_minutes })})
                  </Text>
                  {event.description ? (
                    <Text fz="sm" mt={4}>
                      {event.description}
                    </Text>
                  ) : null}
                </div>
                <Group gap="xs" wrap="nowrap">
                  {event.blocks_matches ? (
                    <Badge color="orange" variant="outline">
                      {t('event_blocks_matches_badge')}
                    </Badge>
                  ) : null}
                  <Menu withinPortal position="bottom-end" shadow="sm">
                    <Menu.Target>
                      <ActionIcon variant="transparent" color="gray">
                        <IconDots size="1.25rem" />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size="1.25rem" />}
                        onClick={() => open(event)}
                      >
                        {t('edit_event_title')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size="1.25rem" />}
                        color="red"
                        onClick={async () => {
                          await deleteTournamentEvent(tournamentId, event.id);
                          await reload();
                        }}
                      >
                        {t('delete_button')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}
