import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Container,
  FileInput,
  Grid,
  Group,
  Image,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconCheck, IconPhoto, IconPlus, IconTrash } from '@tabler/icons-react';
import { TFunction } from 'i18next';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DashboardFooter } from '@components/dashboard/footer';
import { DoubleHeader, getTournamentHeadTitle } from '@components/dashboard/layout';
import { RichText } from '@components/dashboard/rules_content';
import { shrinkToDataUrl } from '@components/utils/image';
import { registrationIsOpen } from '@components/utils/tournament';
import { setTitle } from '@components/utils/util';
import { Tournament } from '@openapi';
import { requestSucceeded } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { registerTeam } from '@services/team';

// One confirmation per line of the tournament's registration terms, blank lines ignored.
function registrationTerms(tournament: Tournament): string[] {
  return (tournament.registration_terms ?? '')
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}

/**
 * What the API said went wrong, in German where we know the wording. Anything we do not
 * recognise is passed through as it came, which beats a blank screen.
 */
function registrationErrorMessage(t: TFunction, result: any): string {
  const detail = result?.response?.data?.detail;
  const text = Array.isArray(detail) ? (detail[0]?.msg ?? '') : `${detail ?? ''}`;
  const known: { [message: string]: string } = {
    'The registration password is incorrect': t('registration_password_wrong_error'),
    'Registration is not open for this tournament': t('registration_closed_message'),
    'The registration deadline has passed': t('registration_closed_deadline_message'),
    'This tournament asks every team for a contact person and phone number':
      t('contact_required_error'),
  };
  return known[text] ?? (text.length > 0 ? text : t('registration_failed_error'));
}

function RegistrationForm({
  tournamentId,
  minSize,
  maxSize,
  passwordRequired,
  terms,
  contactRequired,
  onSuccess,
}: {
  tournamentId: number;
  minSize: number;
  maxSize: number;
  passwordRequired: boolean;
  // One confirmation the team has to tick off per entry.
  terms: string[];
  contactRequired: boolean;
  onSuccess: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const form = useForm({
    initialValues: {
      team_name: '',
      password: '',
      player_names: Array.from({ length: minSize }, () => ''),
      accepted_terms: terms.map(() => false),
      contact_name: '',
      contact_phone: '',
      logo: null as string | null,
      description: '',
    },
    validate: {
      team_name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
      password: (value) =>
        !passwordRequired || value.length > 0 ? null : t('registration_password_validation'),
      player_names: (value: string[]) =>
        value.every((name) => name.trim().length > 0) ? null : t('player_name_required_validation'),
      accepted_terms: (value: boolean[]) =>
        value.every(Boolean) ? null : t('registration_terms_validation'),
      contact_name: (value: string) =>
        !contactRequired || value.trim().length > 0 ? null : t('contact_name_validation'),
      contact_phone: (value: string) =>
        !contactRequired || value.trim().length > 0 ? null : t('contact_phone_validation'),
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
        setFailure(null);
        const result = await registerTeam(
          tournamentId,
          values.team_name,
          values.player_names,
          values.password,
          terms,
          values.contact_name,
          values.contact_phone,
          values.logo,
          values.description,
        );
        if (requestSucceeded(result)) {
          onSuccess(values.team_name);
          return;
        }

        // Right above the button that was just pressed: a notification in the corner of a
        // long form is easy to miss, and on a phone it is off the top of the screen.
        setFailure(registrationErrorMessage(t, result));
      })}
    >
      <Title order={3} mb="md">
        {t('register_team_title')}
      </Title>
      <TextInput
        withAsterisk
        size="md"
        label={t('name_input_label')}
        placeholder={t('team_name_input_placeholder')}
        autoComplete="off"
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
              size="md"
              placeholder={t('player_name_input_placeholder')}
              autoComplete="off"
              {...form.getInputProps(`player_names.${index}`)}
            />
            {form.values.player_names.length > minSize ? (
              <ActionIcon
                color="red"
                variant="subtle"
                size="lg"
                aria-label={t('delete_button')}
                onClick={() => removePlayer(index)}
              >
                <IconTrash size={20} />
              </ActionIcon>
            ) : null}
          </Group>
        ))}
      </Stack>

      {form.values.player_names.length < maxSize ? (
        <Button
          variant="light"
          size="md"
          mt="sm"
          leftSection={<IconPlus size={16} />}
          onClick={addPlayer}
        >
          {t('add_player_button')}
        </Button>
      ) : null}

      <Text fz="sm" mt="lg">
        {t('contact_section_label')}
      </Text>
      <Text fz="xs" c="dimmed">
        {contactRequired ? t('contact_required_hint') : t('contact_optional_hint')}
      </Text>
      <Grid mt="xs" gutter="sm">
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <TextInput
            withAsterisk={contactRequired}
            size="md"
            placeholder={t('contact_name_placeholder')}
            autoComplete="off"
            {...form.getInputProps('contact_name')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>
          <TextInput
            withAsterisk={contactRequired}
            size="md"
            placeholder={t('contact_phone_placeholder')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...form.getInputProps('contact_phone')}
          />
        </Grid.Col>
      </Grid>

      {passwordRequired ? (
        <PasswordInput
          withAsterisk
          size="md"
          label={t('registration_password_label')}
          description={t('registration_password_hint')}
          mt="lg"
          // This is a shared password for the tournament, not a personal login, so keep
          // browsers from offering saved credentials for it.
          autoComplete="new-password"
          {...form.getInputProps('password')}
        />
      ) : null}

      {terms.length > 0 ? (
        <Stack gap="xs" mt="lg">
          {terms.map((term: string, index: number) => (
            <Checkbox
              // The wording is the identity here, and it does not change while the form is open.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              size="md"
              label={term}
              {...form.getInputProps(`accepted_terms.${index}`, { type: 'checkbox' })}
            />
          ))}
          {form.errors.accepted_terms != null ? (
            <Text fz="xs" c="red">
              {form.errors.accepted_terms}
            </Text>
          ) : null}
        </Stack>
      ) : null}

      <Textarea
        size="md"
        mt="lg"
        label={t('team_description_label')}
        description={t('team_description_description')}
        placeholder={t('team_description_placeholder')}
        autosize
        minRows={3}
        {...form.getInputProps('description')}
      />

      <FileInput
        clearable
        size="md"
        mt="lg"
        accept="image/png,image/jpeg"
        leftSection={<IconPhoto size={18} />}
        label={t('team_logo_label')}
        description={t('team_logo_description')}
        placeholder={t('team_logo_placeholder')}
        value={logoFile}
        onChange={async (file) => {
          setLogoFile(file);
          // Shrunk here rather than on the server: a photo from a phone is several
          // megabytes, and the form travels over the festival's mobile data.
          form.setFieldValue('logo', file == null ? null : await shrinkToDataUrl(file));
        }}
      />
      {form.values.logo != null ? (
        <Image src={form.values.logo} alt="" h={80} w="auto" fit="contain" mt="xs" />
      ) : null}

      {failure != null ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" mt="lg">
          {failure}
        </Alert>
      ) : null}

      <Button fullWidth size="md" mt="lg" type="submit">
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
              passwordRequired={tournament.registration_password_required}
              terms={registrationTerms(tournament)}
              contactRequired={tournament.registration_contact_required}
              onSuccess={setSuccess}
            />
          )}
        </Container>
      </Container>
      <DashboardFooter />
    </>
  );
}
