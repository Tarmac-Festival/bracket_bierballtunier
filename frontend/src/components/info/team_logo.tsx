import { Image } from '@mantine/core';

import { getBaseApiUrl } from '@services/adapter';

/**
 * The crest a team brought along, wherever its name is shown. Nothing at all for the teams
 * that did not upload one, so a mixed field does not end up with gaps in it.
 */
export function TeamLogo({
  team,
  size = 26,
}: {
  team?: { logo_path?: string | null } | null;
  size?: number;
}) {
  if (team?.logo_path == null) {
    return null;
  }

  return (
    <Image
      src={`${getBaseApiUrl()}/static/team-logos/${team.logo_path}`}
      alt=""
      w={size}
      h={size}
      radius="sm"
      fit="cover"
      style={{ flex: '0 0 auto' }}
    />
  );
}
