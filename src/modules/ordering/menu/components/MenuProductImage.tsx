import type { ImageResizeMode, ImageSourcePropType, ImageStyle, ViewStyle } from 'react-native';
import type { StyleProp } from 'react-native';

import { KioskCachedImage } from '@shared/components/KioskCachedImage';

export type MenuProductImageProps = {
  source?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  brokenIconSize?: number;
  testID?: string;
  onLoad?: () => void;
  onError?: () => void;
};

/** Product/menu image with disk + memory cache for remote URLs. */
export function MenuProductImage(props: MenuProductImageProps) {
  return <KioskCachedImage {...props} />;
}
