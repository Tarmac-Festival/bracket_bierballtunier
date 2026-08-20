import { Button, FileInput, Image, Modal, NumberInput, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPhoto } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { shrinkToDataUrl } from '@components/utils/image';
import { TournamentWinner } from '@openapi';
import { getBaseApiUrl } from '@services/adapter';
import { createTournamentWinner, updateTournamentWinner } from '@services/tournament_winner';

export function TournamentWinnerModal({
  tournamentId,
  winner,
  opened,
  setOpened,
  onSaved,
}: {
  tournamentId: number;
  // null when a new year is added.
  winner: TournamentWinner | null;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  onSaved: () => Promise<any>;
}) {
  const { t } = useTranslation();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const form = useForm({
    initialValues: {
      year: winner?.year ?? new Date().getFullYear() - 1,
      name: winner?.name ?? '',
      description: winner?.description ?? '',
      logo: null as string | null,
    },
    validate: {
      name: (value: string) => (value.length > 0 ? null : t('too_short_name_validation')),
      year: (value: any) =>
        Number(value) >= 1900 && Number(value) <= 2200 ? null : t('winner_year_validation'),
    },
  });

  const storedLogo =
    winner?.logo_path != null ? `${getBaseApiUrl()}/static/winner-logos/${winner.logo_path}` : null;

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={winner != null ? t('edit_winner_title') : t('add_winner_title')}
    >
      <form
        onSubmit={form.onSubmit(async (values) => {
          const fields = {
            year: Number(values.year),
            name: values.name,
            description: values.description,
            logo: values.logo,
          };
          if (winner != null) {
            await updateTournamentWinner(tournamentId, winner.id, fields);
          } else {
            await createTournamentWinner(tournamentId, fields);
          }
          await onSaved();
          setOpened(false);
        })}
      >
        <NumberInput
          withAsterisk
          label={t('winner_year_label')}
          min={1900}
          max={2200}
          {...form.getInputProps('year')}
        />
        <TextInput
          withAsterisk
          mt="sm"
          label={t('winner_name_label')}
          placeholder={t('winner_name_placeholder')}
          {...form.getInputProps('name')}
        />
        <Textarea
          mt="sm"
          label={t('winner_description_label')}
          placeholder={t('winner_description_placeholder')}
          autosize
          minRows={2}
          {...form.getInputProps('description')}
        />

        <FileInput
          clearable
          mt="sm"
          accept="image/png,image/jpeg"
          leftSection={<IconPhoto size={18} />}
          label={t('winner_logo_label')}
          description={winner != null ? t('winner_logo_keep_description') : undefined}
          placeholder={t('team_logo_placeholder')}
          value={logoFile}
          onChange={async (file) => {
            setLogoFile(file);
            form.setFieldValue('logo', file == null ? null : await shrinkToDataUrl(file));
          }}
        />
        {form.values.logo != null || storedLogo != null ? (
          <Image
            src={form.values.logo ?? storedLogo}
            alt=""
            h={80}
            w="auto"
            fit="contain"
            mt="xs"
          />
        ) : null}

        <Button fullWidth mt="lg" color="green" type="submit">
          {t('save_button')}
        </Button>
      </form>
    </Modal>
  );
}
