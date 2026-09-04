import { Button, Divider, Modal, Text, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { SWRResponse } from 'swr';

import { RankingSelect } from '@components/select/ranking_select';
import {
  Ranking,
  RoundWithMatches,
  StageItemWithRounds,
  StagesWithStageItemsResponse,
  Tournament,
} from '@openapi';
import { updateRound } from '@services/round';
import { updateStageItem } from '@services/stage_item';

export function UpdateStageItemModal({
  tournament,
  opened,
  setOpened,
  stageItem,
  swrStagesResponse,
  rankings,
}: {
  tournament: Tournament;
  opened: boolean;
  setOpened: any;
  stageItem: StageItemWithRounds;
  swrStagesResponse: SWRResponse<StagesWithStageItemsResponse>;
  rankings: Ranking[];
}) {
  const { t } = useTranslation();
  const rounds = [...stageItem.rounds].sort((r1, r2) =>
    r1.name.localeCompare(r2.name, undefined, { numeric: true }),
  );

  const form = useForm({
    initialValues: {
      name: stageItem.name,
      ranking_id: rankings.filter((ranking) => ranking.position === 0)[0].id.toString(),
      round_start_times: Object.fromEntries(
        rounds.map((round) => [
          `${round.id}`,
          round.start_time != null ? dayjs(round.start_time) : null,
        ]),
      ) as { [roundId: string]: dayjs.Dayjs | null },
    },
    validate: {},
  });

  return (
    <Modal opened={opened} onClose={() => setOpened(false)} title={t('edit_stage_item_label')}>
      <form
        onSubmit={form.onSubmit(async (values) => {
          await updateStageItem(tournament.id, stageItem.id, values.name, values.ranking_id);

          for (const round of rounds) {
            const chosen = values.round_start_times[`${round.id}`];
            const before = round.start_time != null ? dayjs(round.start_time).toISOString() : null;
            const after = chosen != null ? dayjs(chosen).toISOString() : null;
            if (before !== after) {
              await updateRound(tournament.id, round.id, round.name, round.is_draft, after);
            }
          }

          await swrStagesResponse.mutate();
          setOpened(false);
        })}
      >
        <TextInput
          label={t('name_input_label')}
          placeholder=""
          required
          my="lg"
          type="text"
          {...form.getInputProps('name')}
        />
        <RankingSelect form={form} rankings={rankings} />

        {rounds.length > 0 ? (
          <>
            <Divider my="lg" />
            <Text fw={600}>{t('round_start_times_title')}</Text>
            <Text fz="sm" c="dimmed" mb="sm">
              {t('round_start_times_description')}
            </Text>
            {rounds.map((round: RoundWithMatches) => (
              <DateTimePicker
                key={round.id}
                clearable
                label={round.name}
                placeholder={t('round_start_time_placeholder')}
                mt="sm"
                {...form.getInputProps(`round_start_times.${round.id}`)}
              />
            ))}
          </>
        ) : null}

        <Button fullWidth style={{ marginTop: 16 }} color="green" type="submit">
          {t('save_button')}
        </Button>
      </form>
    </Modal>
  );
}
