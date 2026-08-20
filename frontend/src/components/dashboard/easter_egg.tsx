import { Box, Image, Progress, Stack, Text } from '@mantine/core';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  BucketReward,
  Corridor,
  Digging,
  Forest,
  HangarInside,
  HangarOutside,
} from '@components/dashboard/easter_egg_scenes';

// How many swings of the spade it takes.
const DIGS = 4;

type Scene = 'outside' | 'inside' | 'corridor' | 'forest' | 'digging' | 'reward';

/**
 * The walk that opens after three clicks on a winner's logo: up to the hangar, in through
 * the vault, out the door at the back into a passage that gives way to the right, into the
 * wood — and there, for whoever spots the mark on the right tree, down into the ground.
 */
export function EasterEggAdventure({
  opened,
  onClose,
  backdrop,
}: {
  opened: boolean;
  onClose: () => void;
  // An uploaded picture for the first scene; the drawn one is used without it.
  backdrop: string | null;
}) {
  const { t } = useTranslation();
  const [scene, setScene] = useState<Scene>('outside');
  const [depth, setDepth] = useState(0);
  const [nudged, setNudged] = useState(false);

  const close = () => {
    onClose();
    // Whoever comes back starts at the gate again.
    setScene('outside');
    setDepth(0);
    setNudged(false);
  };

  const dig = () => {
    const swings = depth + 1;
    setDepth(swings);
    if (swings >= DIGS) {
      setScene('reward');
    }
  };

  const scenes: {
    [key in Scene]: { picture: React.ReactNode; caption: string; onClick?: () => void };
  } = {
    outside: {
      picture:
        backdrop != null ? (
          <Image src={backdrop} alt="" w="100%" fit="contain" radius="md" />
        ) : (
          <HangarOutside />
        ),
      caption: t('easter_egg_outside'),
      onClick: () => setScene('inside'),
    },
    inside: {
      picture: <HangarInside />,
      caption: t('easter_egg_inside'),
      onClick: () => setScene('corridor'),
    },
    corridor: {
      picture: <Corridor />,
      caption: t('easter_egg_corridor'),
      onClick: () => setScene('forest'),
    },
    forest: {
      // Only the marked tree leads on, so this scene handles its own clicks.
      picture: <Forest onTree={() => setScene('digging')} />,
      caption: nudged ? t('easter_egg_forest_nudge') : t('easter_egg_forest'),
      onClick: () => setNudged(true),
    },
    digging: {
      picture: <Digging depth={depth} />,
      caption: t('easter_egg_digging'),
      onClick: dig,
    },
    reward: {
      picture: <BucketReward />,
      caption: t('easter_egg_reward'),
      onClick: close,
    },
  };

  if (!opened) {
    return null;
  }

  const current = scenes[scene];

  // A plain fixed layer rather than a dialog component: this is a picture to click
  // through, it needs nothing a dialog brings, and it cannot be tripped up by one.
  return (
    <Box
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(13, 15, 17, 0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <Stack
        gap="sm"
        style={{ maxWidth: '40rem', width: '100%' }}
        onClick={(event) => event.stopPropagation()}
      >
        <Box
          onClick={current.onClick}
          style={{ cursor: 'pointer', lineHeight: 0, borderRadius: 8, overflow: 'hidden' }}
          role="presentation"
        >
          {current.picture}
        </Box>

        {scene === 'digging' ? (
          <Progress value={(depth / DIGS) * 100} color="tarmacGreen.4" />
        ) : null}

        <Text fz="sm" c="dimmed" ta="center">
          {current.caption}
        </Text>
        <Text fz="xs" c="dimmed" ta="center" onClick={close} style={{ cursor: 'pointer' }}>
          {t('easter_egg_leave')}
        </Text>
      </Stack>
    </Box>
  );
}

/**
 * Counts clicks that arrive close together and calls back on the third. Returns the handler
 * to hang on whatever is meant to be clicked.
 */
export function useTripleClick(onTriggered: () => void, windowMs = 1500) {
  // A ref rather than state: three clicks can land before React has re-rendered even once,
  // and a counter that is one render behind never reaches three.
  const clicks = useRef<number[]>([]);

  return () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((at) => now - at < windowMs), now];

    if (clicks.current.length >= 3) {
      clicks.current = [];
      onTriggered();
    }
  };
}
