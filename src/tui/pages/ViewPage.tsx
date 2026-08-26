import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { buildDefaultRegistry } from '../../engine/builder.js';
import { runCommand } from '../../engine/executor.js';
import { MVP_ARCHIVE_EXTENSIONS } from '../../engine/types.js';
import { useAppStore } from '../../store/index.js';
import { type ArchiveListing, loadArchiveListing } from '../components/archiveTree.js';
import { FilePicker } from '../components/FilePicker.js';
import { moveCursor, type ScrollAction } from '../components/scrollCursor.js';
import { VirtualTree } from '../components/VirtualTree.js';
import { useT } from '../hooks/useI18n.js';

const PAGE_SIZE = 15;

export const ViewPage: React.FC = () => {
  const t = useT();
  const setRoute = useAppStore((s) => s.setRoute);
  const [archive, setArchive] = useState('');
  const [listing, setListing] = useState<ArchiveListing | null>(null);
  const [cursor, setCursor] = useState(0);

  const nodes = listing?.nodes ?? [];
  const total = nodes.length;

  useInput(
    (input, key) => {
      if (key.escape) {
        setRoute('menu');
        return;
      }
      let action: ScrollAction | null = null;
      if (key.upArrow) action = 'up';
      else if (key.downArrow) action = 'down';
      else if (key.pageUp) action = 'pageUp';
      else if (key.pageDown) action = 'pageDown';
      else if (input === 'g') action = 'home';
      else if (input === 'G') action = 'end';
      if (action) setCursor((c) => moveCursor(c, total, action, PAGE_SIZE));
    },
    { isActive: archive !== '' },
  );

  if (archive === '') {
    return (
      <Box flexDirection="column">
        <Text>{t('menu.view')}</Text>
        <FilePicker
          mode="openFile"
          filterExtensions={[...MVP_ARCHIVE_EXTENSIONS]}
          onConfirm={async (p) => {
            setArchive(p);
            setListing(null);
            setCursor(0);
            setListing(await loadArchiveListing(p, buildDefaultRegistry(), runCommand));
          }}
          onCancel={() => setRoute('menu')}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        {t('menu.view')}: {archive}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {listing === null ? (
          <Text dimColor>{t('view.loading')}</Text>
        ) : !listing.ok ? (
          <Text color="red">
            {t('view.failed')}: {listing.error}
          </Text>
        ) : total === 0 ? (
          <Text dimColor>{t('view.empty')}</Text>
        ) : (
          <VirtualTree
            nodes={nodes}
            pageSize={PAGE_SIZE}
            selectedIndex={cursor}
            showSize
            showDirMarker={false}
            countLabel={t('view.itemCount', {
              total,
              shown: Math.min(PAGE_SIZE, total),
            })}
          />
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{t('view.hint')}</Text>
      </Box>
    </Box>
  );
};
