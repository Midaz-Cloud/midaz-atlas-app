import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { Button } from './Button';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Prefer `Button` with `variant="primary"`. */
export function PrimaryButton({ title, style, ...rest }: PrimaryButtonProps) {
  return <Button title={title} variant="primary" style={style} {...rest} />;
}
