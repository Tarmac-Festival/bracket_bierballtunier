import { Accordion, List, Text, Title } from '@mantine/core';
import React from 'react';

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbers'; items: string[] };

type Section = { title: string; blocks: Block[] };

const SECTION_RE = /^##\s+(.*)$/;
const SUBHEADING_RE = /^###\s+(.*)$/;
const BULLET_RE = /^[*-]\s+(.*)$/;
const NUMBER_RE = /^\d+[.)]\s+(.*)$/;

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 1) continue;

    const subheading = SUBHEADING_RE.exec(line);
    if (subheading) {
      blocks.push({ kind: 'subheading', text: subheading[1] });
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'bullets') last.items.push(bullet[1]);
      else blocks.push({ kind: 'bullets', items: [bullet[1]] });
      continue;
    }

    const numbered = NUMBER_RE.exec(line);
    if (numbered) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'numbers') last.items.push(numbered[1]);
      else blocks.push({ kind: 'numbers', items: [numbered[1]] });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: line });
  }

  return blocks;
}

/**
 * Splits the rules text into collapsible sections. Lines starting with `## ` open a new
 * section; anything before the first one is shown above the sections as an introduction.
 */
export function parseRules(rules: string): { intro: Block[]; sections: Section[] } {
  const introLines: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];

  for (const line of rules.split('\n')) {
    const section = SECTION_RE.exec(line.trim());
    if (section) {
      sections.push({ title: section[1], lines: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  return {
    intro: parseBlocks(introLines),
    sections: sections.map((section) => ({
      title: section.title,
      blocks: parseBlocks(section.lines),
    })),
  };
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case 'subheading':
            return (
              <Title order={5} key={key} mt="md" mb="xs">
                {block.text}
              </Title>
            );
          case 'bullets':
          case 'numbers':
            return (
              <List
                key={key}
                type={block.kind === 'numbers' ? 'ordered' : 'unordered'}
                spacing="xs"
                my="sm"
                withPadding
              >
                {block.items.map((item) => (
                  <List.Item key={item}>{item}</List.Item>
                ))}
              </List>
            );
          default:
            return (
              <Text key={key} my="sm">
                {block.text}
              </Text>
            );
        }
      })}
    </>
  );
}

export function RulesContent({ rules }: { rules: string }) {
  const { intro, sections } = parseRules(rules);

  // Without any `## ` headings there is nothing to collapse, so show the text as-is.
  if (sections.length < 1) {
    return (
      <Text style={{ whiteSpace: 'pre-wrap' }} size="md">
        {rules}
      </Text>
    );
  }

  return (
    <>
      {intro.length > 0 ? <Blocks blocks={intro} /> : null}
      <Accordion variant="separated" radius="md" mt="md">
        {sections.map((section) => (
          <Accordion.Item key={section.title} value={section.title}>
            <Accordion.Control>
              <Text fw={600}>{section.title}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Blocks blocks={section.blocks} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </>
  );
}
