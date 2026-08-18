import {
  Button,
  Center,
  Checkbox,
  Container,
  CopyButton,
  Divider,
  Fieldset,
  Grid,
  Group,
  Image,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { MdDelete } from '@react-icons/all-files/md/MdDelete';
import { MdUnarchive } from '@react-icons/all-files/md/MdUnarchive';
import { IconCalendar, IconCalendarTime, IconCopy, IconPencil } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MdArchive } from 'react-icons/md';
import { useNavigate } from 'react-router';
import { SWRResponse } from 'swr';

import { assert_not_none } from '@components/utils/assert';
import { DropzoneButton } from '@components/utils/file_upload';
import { GenericSkeletonThreeRows } from '@components/utils/skeletons';
import { teamSizeRangeIsValid } from '@components/utils/tournament';
import { capitalize, getBaseURL, getTournamentIdFromRouter } from '@components/utils/util';
import { Club, Tournament, TournamentResponse } from '@openapi';
import NotFoundTitle from '@pages/404';
import TournamentLayout from '@pages/tournaments/_tournament_layout';
import {
  getBaseApiUrl,
  getClubs,
  getTournamentById,
  handleRequestError,
  removeTournamentLogo,
} from '@services/adapter';
import {
  archiveTournament,
  deleteTournament,
  unarchiveTournament,
  updateTournament,
} from '@services/tournament';
import dayjs from 'dayjs';

export function TournamentLogo({ tournament }: { tournament: Tournament | null }) {
  if (tournament == null || tournament.logo_path == null) return null;
  return (
    <Image
      radius="md"
      alt="Logo of the tournament"
      src={`${getBaseApiUrl()}/static/tournament-logos/${tournament.logo_path}`}
    />
  );
}

function ArchiveTournamentButton({
  t,
  tournament,
  swrTournamentResponse,
}: {
  t: any;
  tournament: Tournament;
  swrTournamentResponse: SWRResponse<TournamentResponse>;
}) {
  return (
    <Button
      variant="outline"
      mt="sm"
      color="orange"
      size="lg"
      leftSection={<MdArchive size={36} />}
      onClick={async () => {
        await archiveTournament(tournament.id).catch((response: any) =>
          handleRequestError(response),
        );
        await swrTournamentResponse.mutate();
      }}
    >
      {t('archive_tournament_button')}
    </Button>
  );
}

function UnarchiveTournamentButton({
  t,
  tournament,
  swrTournamentResponse,
}: {
  t: any;
  tournament: Tournament;
  swrTournamentResponse: SWRResponse<TournamentResponse>;
}) {
  return (
    <Button
      variant="outline"
      mt="sm"
      color="orange"
      size="lg"
      leftSection={<MdUnarchive size={36} />}
      onClick={async () => {
        await unarchiveTournament(tournament.id).catch((response: any) =>
          handleRequestError(response),
        );
        await swrTournamentResponse.mutate();
      }}
    >
      {t('unarchive_tournament_button')}
    </Button>
  );
}

function GeneralTournamentForm({
  tournament,
  swrTournamentResponse,
  clubs,
}: {
  tournament: Tournament;
  swrTournamentResponse: SWRResponse<TournamentResponse>;
  clubs: Club[];
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      start_time: dayjs(tournament.start_time),
      name: tournament.name,
      club_id: `${tournament.club_id}`,
      dashboard_public: tournament.dashboard_public,
      dashboard_endpoint: tournament.dashboard_endpoint,
      rules: tournament.rules || '',
      registration_enabled: tournament.registration_enabled,
      registration_info: tournament.registration_info || '',
      registration_password: '',
      remove_registration_password: false,
      registration_deadline: tournament.registration_deadline
        ? dayjs(tournament.registration_deadline)
        : null,
      team_size_min: tournament.team_size_min,
      team_size_max: tournament.team_size_max,
      max_teams: tournament.max_teams,
      players_can_be_in_multiple_teams: tournament.players_can_be_in_multiple_teams,
      auto_assign_courts: tournament.auto_assign_courts,
      duration_minutes: tournament.duration_minutes,
      margin_minutes: tournament.margin_minutes,
    },

    validate: {
      name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
      club_id: (value) => (value != null ? null : t('club_choose_title')),
      start_time: (value) => (value != null ? null : t('start_time_choose_title')),
      duration_minutes: (value) =>
        value != null && value > 0 ? null : t('duration_minutes_choose_title'),
      margin_minutes: (value) =>
        value != null && value > 0 ? null : t('margin_minutes_choose_title'),
      team_size_min: (value, values) =>
        teamSizeRangeIsValid(value, values.team_size_max) ? null : t('team_size_min_validation'),
      team_size_max: (value, values) =>
        teamSizeRangeIsValid(values.team_size_min, value) ? null : t('team_size_max_validation'),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        assert_not_none(values.club_id);

        await updateTournament(
          tournament.id,
          values.name,
          values.dashboard_public,
          values.dashboard_endpoint,
          values.players_can_be_in_multiple_teams,
          values.auto_assign_courts,
          values.start_time,
          values.duration_minutes,
          values.margin_minutes,
          values.rules,
          values.registration_enabled,
          values.registration_info,
          values.registration_password,
          values.remove_registration_password,
          values.registration_deadline,
          values.team_size_min,
          values.team_size_max,
          values.max_teams,
        );

        await swrTournamentResponse.mutate();
      })}
    >
      <TextInput
        withAsterisk
        label={t('name_input_label')}
        placeholder={t('tournament_name_input_placeholder')}
        {...form.getInputProps('name')}
      />

      <Select
        withAsterisk
        data={clubs.map((p) => ({ value: `${p.id}`, label: p.name }))}
        label={capitalize(t('clubs_title'))}
        placeholder={t('club_select_placeholder')}
        searchable
        limit={20}
        mt="lg"
        {...form.getInputProps('club_id')}
      />

      <Fieldset legend={t('planning_of_matches_legend')} mt="lg" radius="md">
        <Text fz="sm">{t('planning_of_matches_description')}</Text>
        <Grid>
          <Grid.Col span={{ sm: 9 }}>
            <DateTimePicker
              rightSection={<IconCalendar size="1.1rem" stroke={1.5} />}
              mx="auto"
              {...form.getInputProps('start_time')}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 3 }}>
            <Button
              fullWidth
              color="indigo"
              leftSection={<IconCalendarTime size="1.1rem" stroke={1.5} />}
              onClick={() => {
                form.setFieldValue('start_time', dayjs());
              }}
            >
              {t('set_to_new_button')}
            </Button>
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={{ sm: 6 }}>
            <NumberInput
              label={t('match_duration_label')}
              mt="lg"
              {...form.getInputProps('duration_minutes')}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 6 }}>
            <NumberInput
              label={t('time_between_matches_label')}
              mt="lg"
              {...form.getInputProps('margin_minutes')}
            />
          </Grid.Col>
        </Grid>
      </Fieldset>
      <Fieldset legend={t('tournament_rules_legend')} mt="lg" radius="md">
        <Textarea
          label={t('tournament_rules_label')}
          description={t('tournament_rules_format_description')}
          placeholder={t('tournament_rules_placeholder')}
          minRows={8}
          autosize
          {...form.getInputProps('rules')}
        />
      </Fieldset>
      <Fieldset legend={t('registration_settings_legend')} mt="lg" radius="md">
        <Checkbox
          label={t('registration_enabled_description')}
          {...form.getInputProps('registration_enabled', { type: 'checkbox' })}
        />

        <TextInput
          label={t('registration_password_label')}
          description={
            tournament.registration_password_required
              ? t('registration_password_set_description')
              : t('registration_password_description')
          }
          placeholder={
            tournament.registration_password_required
              ? t('registration_password_set_placeholder')
              : t('registration_password_placeholder')
          }
          mt="lg"
          disabled={form.values.remove_registration_password}
          {...form.getInputProps('registration_password')}
        />

        {tournament.registration_password_required ? (
          <Checkbox
            mt="sm"
            label={t('registration_password_remove_label')}
            {...form.getInputProps('remove_registration_password', { type: 'checkbox' })}
          />
        ) : null}

        <Textarea
          label={t('registration_info_label')}
          description={t('registration_info_description')}
          placeholder={t('registration_info_placeholder')}
          mt="lg"
          minRows={4}
          autosize
          {...form.getInputProps('registration_info')}
        />

        <Text fz="sm" mt="lg">
          {t('registration_deadline_label')}
        </Text>
        <DateTimePicker
          clearable
          placeholder={t('registration_deadline_placeholder')}
          rightSection={<IconCalendar size="1.1rem" stroke={1.5} />}
          {...form.getInputProps('registration_deadline')}
        />

        <Grid>
          <Grid.Col span={{ sm: 4 }}>
            <NumberInput
              label={t('team_size_min_label')}
              min={1}
              mt="lg"
              {...form.getInputProps('team_size_min')}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 4 }}>
            <NumberInput
              label={t('team_size_max_label')}
              min={1}
              mt="lg"
              {...form.getInputProps('team_size_max')}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 4 }}>
            <NumberInput
              label={t('max_teams_label')}
              placeholder={t('max_teams_placeholder')}
              min={1}
              mt="lg"
              {...form.getInputProps('max_teams')}
            />
          </Grid.Col>
        </Grid>

        {form.values.registration_enabled ? (
          <Grid mt="lg">
            <Grid.Col span={{ sm: 9 }}>
              <TextInput
                readOnly
                label={t('registration_link_label')}
                value={`${getBaseURL()}/tournaments/${tournament.dashboard_endpoint}/dashboard/register`}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 3 }}>
              <CopyButton
                value={`${getBaseURL()}/tournaments/${tournament.dashboard_endpoint}/dashboard/register`}
              >
                {({ copied, copy }) => (
                  <Button
                    mt="1.55rem"
                    leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                    fullWidth
                    color={copied ? 'teal' : 'indigo'}
                    onClick={copy}
                  >
                    {copied ? t('copied_url_button') : t('copy_url_button')}
                  </Button>
                )}
              </CopyButton>
            </Grid.Col>
          </Grid>
        ) : null}
      </Fieldset>
      <Fieldset legend={t('dashboard_settings_title')} mt="lg" radius="md">
        <Text fz="sm">{t('dashboard_link_label')}</Text>
        <Grid>
          <Grid.Col span={{ sm: 9 }}>
            <TextInput
              placeholder={t('dashboard_link_placeholder')}
              {...form.getInputProps('dashboard_endpoint')}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 3 }}>
            <CopyButton
              value={`${getBaseURL()}/tournaments/${tournament.dashboard_endpoint}/dashboard`}
            >
              {({ copied, copy }) => (
                <Button
                  disabled={form.values.dashboard_endpoint === ''}
                  leftSection={<IconCopy size="1.1rem" stroke={1.5} />}
                  fullWidth
                  color={copied ? 'teal' : 'indigo'}
                  onClick={copy}
                >
                  {copied ? t('copied_url_button') : t('copy_url_button')}
                </Button>
              )}
            </CopyButton>
          </Grid.Col>
        </Grid>

        <Checkbox
          mt="lg"
          label={t('dashboard_public_description')}
          {...form.getInputProps('dashboard_public', { type: 'checkbox' })}
        />

        <DropzoneButton
          tournamentId={tournament.id}
          swrResponse={swrTournamentResponse}
          variant="tournament"
        />
        <Center my="lg">
          <div style={{ width: '50%' }}>
            <TournamentLogo tournament={tournament} />
          </div>
        </Center>
        <Button
          variant="outline"
          color="red"
          fullWidth
          onClick={async () => {
            await removeTournamentLogo(tournament.id);
            await swrTournamentResponse.mutate();
          }}
        >
          {t('remove_logo')}
        </Button>
      </Fieldset>
      <Fieldset legend={t('miscellaneous_title')} mt="lg" radius="md">
        <Checkbox
          label={t('miscellaneous_label')}
          {...form.getInputProps('players_can_be_in_multiple_teams', { type: 'checkbox' })}
        />
        <Checkbox
          mt="md"
          label={t('auto_assign_courts_label')}
          {...form.getInputProps('auto_assign_courts', { type: 'checkbox' })}
        />
      </Fieldset>

      <Button
        fullWidth
        mt={24}
        size="md"
        color="green"
        type="submit"
        leftSection={<IconPencil size={36} />}
      >
        {t('save_button')}
      </Button>

      <Divider mt="2rem" mb="1rem" size="2px" />
      <Group grow>
        <Button
          variant="outline"
          mt="sm"
          color="red"
          size="lg"
          leftSection={<MdDelete size={36} />}
          onClick={async () => {
            await deleteTournament(tournament.id)
              .then(async () => {
                await navigate('/');
              })
              .catch((response: any) => handleRequestError(response));
          }}
        >
          {t('delete_tournament_button')}
        </Button>

        {tournament.status === 'OPEN' ? (
          <ArchiveTournamentButton
            tournament={tournament}
            t={t}
            swrTournamentResponse={swrTournamentResponse}
          />
        ) : (
          <UnarchiveTournamentButton
            tournament={tournament}
            t={t}
            swrTournamentResponse={swrTournamentResponse}
          />
        )}
      </Group>
    </form>
  );
}

export default function SettingsPage() {
  const { tournamentData } = getTournamentIdFromRouter();
  const swrClubsResponse = getClubs();
  const swrTournamentResponse = getTournamentById(tournamentData.id);
  const tournamentDataFull =
    swrTournamentResponse.data != null ? swrTournamentResponse.data.data : null;

  const clubs = swrClubsResponse.data != null ? swrClubsResponse.data.data : [];

  let content = <NotFoundTitle />;

  if (swrTournamentResponse.isLoading || swrClubsResponse.isLoading) {
    content = <GenericSkeletonThreeRows />;
  }

  if (tournamentDataFull != null) {
    content = (
      <GeneralTournamentForm
        tournament={tournamentDataFull}
        swrTournamentResponse={swrTournamentResponse}
        clubs={clubs}
      />
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Container>{content}</Container>
    </TournamentLayout>
  );
}
