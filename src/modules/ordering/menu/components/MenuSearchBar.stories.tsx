import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { MenuSearchBar } from './MenuSearchBar';

function MenuSearchBarInteractive() {
  const [value, setValue] = useState('');

  return <MenuSearchBar value={value} onChangeText={setValue} />;
}

const meta = {
  title: 'Modules/Ordering/Menu/MenuSearchBar',
  component: MenuSearchBar,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View style={{ flex: 1, backgroundColor: kioskScreenColors.screenBackground }}>
        <Story />
      </View>
    ),
  ],
  args: {
    value: '',
    onChangeText: () => {},
  },
} satisfies Meta<typeof MenuSearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
  render: () => <MenuSearchBarInteractive />,
};

export const English: Story = {
  parameters: { locale: 'en' },
  render: () => <MenuSearchBarInteractive />,
};
