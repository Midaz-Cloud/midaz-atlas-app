import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: [
    '../src/shared/**/*.stories.?(ts|tsx|js|jsx)',
    {
      directory: '../src/modules',
      titlePrefix: 'Modules',
      files: '**/*.stories.?(ts|tsx|js|jsx)',
    },
  ],
  deviceAddons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
  ],
};

export default main;
