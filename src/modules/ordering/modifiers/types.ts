import type { ImageSourcePropType } from 'react-native';

export type ModifierOption = {
  id: string;
  nameKey: string;
  displayName?: string;
  image?: ImageSourcePropType;
  /** Extra price beyond free quota (mock options are 0). */
  priceUsd: number;
};

/** @deprecated Use ModifierOption */
export type ToppingModifier = ModifierOption;

export type ModifierSelectionMode = 'single' | 'multi';

export type ModifierGroup = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  /** Live API group title (overrides i18n). */
  displayTitle?: string;
  displayDescription?: string;
  selectionMode: ModifierSelectionMode;
  minSelections: number;
  maxSelections: number;
  freeIncluded: number;
  optionIds: string[];
};

export type ModifierFlow = {
  id: string;
  groupIds: string[];
};
