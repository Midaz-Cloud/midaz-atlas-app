import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import banksFixture from '@shared/api/kiosk/fixtures/live/banks.response.json';
import type { KioskBank } from '@shared/api/kiosk';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { BankSelectorSheet } from './BankSelectorSheet';

function BankSelectorSheetStory() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<KioskBank | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <BankSelectorSheet
        visible={open}
        banks={banksFixture as KioskBank[]}
        selectedCode={selected?.code}
        onClose={() => setOpen(false)}
        onSelect={setSelected}
      />
    </View>
  );
}

const meta = {
  title: 'Modules/Payment/Mobile/BankSelectorSheet',
  component: BankSelectorSheetStory,
  decorators: [withI18nStorybook],
} satisfies Meta<typeof BankSelectorSheetStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};
