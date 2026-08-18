import { Alert, Button, Group, Text } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { DateTime } from '@components/utils/datetime';
import PreloadLink from '@components/utils/link';
import { registrationIsOpen } from '@components/utils/tournament';
import { Tournament } from '@openapi';

export function RegistrationBanner({ tournament }: { tournament: Tournament }) {
  const { t } = useTranslation();

  if (!registrationIsOpen(tournament)) {
    return null;
  }

  return (
    <Alert
      icon={<IconUserPlus size={20} />}
      color="green"
      radius="md"
      title={t('registration_banner_title')}
      mt="md"
      style={{ width: '100%' }}
    >
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Text fz="sm">
            {t('team_members_label')}: {tournament.team_size_min}
            {tournament.team_size_min !== tournament.team_size_max
              ? `-${tournament.team_size_max}`
              : ''}
          </Text>
          {tournament.registration_deadline != null ? (
            <Text fz="sm">
              {t('registration_deadline_label')}:{' '}
              <DateTime datetime={tournament.registration_deadline} />
            </Text>
          ) : null}
        </div>
        <Button
          component={PreloadLink}
          href={`/tournaments/${tournament.dashboard_endpoint}/dashboard/register`}
          color="green"
          leftSection={<IconUserPlus size={18} />}
        >
          {t('register_button')}
        </Button>
      </Group>
    </Alert>
  );
}
