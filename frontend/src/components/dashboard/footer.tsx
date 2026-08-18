import { Anchor, Container, Group, Text } from '@mantine/core';

import classes from './footer.module.css';

export function DashboardFooter() {
  return (
    <div className={classes.footer}>
      <Container className={classes.inner}>
        <Text className={classes.brand}>Tarmac Bierballturnier</Text>
        <Group className={classes.links}>
          <Anchor<'a'> c="dimmed" href="https://tarmac-festival.de" size="sm">
            tarmac-festival.de
          </Anchor>
          {/*
            Bracket is AGPL-3.0: anyone using this over a network has to be able to get
            the source of our modified version, so this link has to stay.
          */}
          <Anchor<'a'>
            c="dimmed"
            href="https://github.com/Tarmac-Festival/bracket_bierballtunier"
            size="sm"
          >
            Quellcode
          </Anchor>
        </Group>
      </Container>
    </div>
  );
}
