import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { MenuSearchField } from './MenuSearchField';

function MenuSearchFieldInteractive({
  focusAccent,
}: {
  focusAccent?: 'orange' | 'blue';
}) {
  const [value, setValue] = useState('');

  return (
    <MenuSearchField
      value={value}
      onChangeText={setValue}
      focusAccent={focusAccent}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Menu/MenuSearchField',
  component: MenuSearchField,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: kioskScreenColors.screenBackground,
        }}>
        <Story />
      </View>
    ),
  ],
  args: {
    value: '',
    onChangeText: () => {},
  },
} satisfies Meta<typeof MenuSearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  parameters: { locale: 'es' },
  render: () => <MenuSearchFieldInteractive />,
};

export const InteractiveBlue: Story = {
  parameters: { locale: 'es' },
  render: () => <MenuSearchFieldInteractive focusAccent="blue" />,
};

export const FocusedOrange: Story = {
  parameters: { locale: 'es' },
  args: {
    value: 'Helado',
    focused: true,
    focusAccent: 'orange',
  },
};

export const FocusedBlue: Story = {
  parameters: { locale: 'es' },
  args: {
    value: 'Helado',
    focused: true,
    focusAccent: 'blue',
  },
};

export const WithValue: Story = {
  parameters: { locale: 'es' },
  args: {
    value: 'Vaso mediano',
  },
};
