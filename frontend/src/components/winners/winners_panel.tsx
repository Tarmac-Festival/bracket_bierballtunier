import { ActionIcon, Button, Card, Group, Image, Menu, Stack, Text, Title } from '@mantine/core';
import { IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { TournamentWinnerModal } from '@components/modals/tournament_winner_modal';
import { TournamentWinner, TournamentWinnersResponse } from '@openapi';
import { getBaseApiUrl } from '@services/adapter';
import { deleteTournamentWinner } from '@services/tournament_winner';

export function WinnersPanel({
  tournamentId,
  swrWinnersResponse,
}: {
  tournamentId: number;
  swrWinnersResponse: SWRResponse<TournamentWinnersResponse>;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<TournamentWinner | null>(null);

  const winners = swrWinnersResponse.data?.data ?? [];

  const open = (winner: TournamentWinner | null) => {
    setEditing(winner);
    setOpened(true);
  };

  return (
    <>
      {opened ? (
        <TournamentWinnerModal
          // Remounted per entry so the form starts from the right values.
          key={editing?.id ?? 'new'}
          tournamentId={tournamentId}
          winner={editing}
          opened={opened}
          setOpened={setOpened}
          onSaved={async () => {
            await swrWinnersResponse.mutate();
          }}
        />
      ) : null}

      <Group justify="space-between" mb="sm">
        <Title order={4}>{t('winners_title')}</Title>
        <Button
          variant="outline"
          color="green"
          size="xs"
          leftSection={<IconPlus size={18} />}
          onClick={() => open(null)}
        >
          {t('add_winner_title')}
        </Button>
      </Group>

      {winners.length < 1 ? (
        <Text c="dimmed" fz="sm">
          {t('no_winners_description')}
        </Text>
      ) : (
        <Stack gap="xs">
          {winners.map((winner) => (
            <Card key={winner.id} withBorder radius="md" padding="sm">
              <Group justify="space-between" wrap="nowrap" align="start">
                <Group gap="sm" wrap="nowrap" align="start">
                  {winner.logo_path != null ? (
                    <Image
                      src={`${getBaseApiUrl()}/static/winner-logos/${winner.logo_path}`}
                      alt=""
                      h={40}
                      w="auto"
                      maw={100}
                      fit="contain"
                    />
                  ) : null}
                  <div>
                    <Text fw={600}>
                      {winner.year} · {winner.name}
                    </Text>
                    {winner.description ? (
                      <Text fz="sm" c="dimmed">
                        {winner.description}
                      </Text>
                    ) : null}
                  </div>
                </Group>
                <Menu withinPortal position="bottom-end" shadow="sm">
                  <Menu.Target>
                    <ActionIcon variant="transparent" color="gray">
                      <IconDots size="1.25rem" />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size="1.25rem" />}
                      onClick={() => open(winner)}
                    >
                      {t('edit_winner_title')}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size="1.25rem" />}
                      color="red"
                      onClick={async () => {
                        await deleteTournamentWinner(tournamentId, winner.id);
                        await swrWinnersResponse.mutate();
                      }}
                    >
                      {t('delete_button')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}
