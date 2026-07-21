import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type KioskDevJsonPanelProps = {
  title: string;
  /** Shown above the JSON block (e.g. product name, API mode). */
  meta?: string;
  data: unknown;
  testID?: string;
  maxHeight?: number;
};

function formatJson(data: unknown): string {
  if (data === undefined) {
    return 'undefined';
  }
  if (data === null) {
    return 'null';
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/** Dev overlay: scrollable JSON block (same visual language as home debug panels). */
export function KioskDevJsonPanel({
  title,
  meta,
  data,
  testID = 'kiosk-dev-json-panel',
  maxHeight = kioskScale(360),
}: KioskDevJsonPanelProps) {
  if (!showKioskDevUi()) {
    return null;
  }

  return (
    <View style={[styles.panel, { maxHeight }]} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        persistentScrollbar>
        <Text style={styles.json} selectable>
          {formatJson(data)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: kioskScale(1),
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: kioskScale(14),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
    gap: kioskScale(6),
  },
  scroll: {
    maxHeight: kioskScale(300),
  },
  title: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(20),
    fontWeight: '700',
  },
  meta: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: kioskScale(14),
  },
  json: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(13),
    fontFamily: 'monospace',
  },
});
