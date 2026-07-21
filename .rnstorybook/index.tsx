import 'react-native-gesture-handler';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRegistry } from 'react-native';

import { name as appName } from '../app.json';

import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

AppRegistry.registerComponent(appName, () => StorybookUIRoot);

export default StorybookUIRoot;