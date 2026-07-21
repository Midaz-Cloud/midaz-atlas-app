import type { ModifierGroup, ModifierOption } from '../types';

const images = {
  oreo: require('@assets/images/ordering/modifiers/topping-oreo.png'),
  fresas: require('@assets/images/ordering/modifiers/topping-fresas.png'),
  chispas: require('@assets/images/ordering/modifiers/topping-chispas.png'),
  gomitas: require('@assets/images/ordering/modifiers/topping-gomitas.png'),
} as const;

export const mockModifierOptions: ModifierOption[] = [
  {
    id: 'oreo',
    nameKey: 'modifiers.toppings.oreo',
    image: images.oreo,
    priceUsd: 0,
  },
  {
    id: 'fresas',
    nameKey: 'modifiers.toppings.fresas',
    image: images.fresas,
    priceUsd: 0,
  },
  {
    id: 'gomitas',
    nameKey: 'modifiers.toppings.gomitas',
    image: images.gomitas,
    priceUsd: 0,
  },
  {
    id: 'chispas',
    nameKey: 'modifiers.toppings.chispas',
    image: images.chispas,
    priceUsd: 0,
  },
  {
    id: 'brownie',
    nameKey: 'modifiers.toppings.brownie',
    priceUsd: 0,
  },
  {
    id: 'sirope-fresa',
    nameKey: 'modifiers.options.siropeFresa',
    priceUsd: 0,
  },
  {
    id: 'sirope-chocolate',
    nameKey: 'modifiers.options.siropeChocolate',
    priceUsd: 0,
  },
  {
    id: 'yogurt-light',
    nameKey: 'modifiers.options.yogurtLight',
    priceUsd: 0,
  },
  {
    id: 'yogurt-normal',
    nameKey: 'modifiers.options.yogurtNormal',
    priceUsd: 0,
  },
];

/** @deprecated Use mockModifierOptions */
export const mockToppings = mockModifierOptions;

export const mockModifierGroups: Record<string, ModifierGroup> = {
  'cup-large-toppings': {
    id: 'cup-large-toppings',
    titleKey: 'modifiers.groups.cupLargeToppings.title',
    descriptionKey: 'modifiers.groups.cupLargeToppings.description',
    selectionMode: 'multi',
    minSelections: 1,
    maxSelections: 4,
    freeIncluded: 4,
    optionIds: ['oreo', 'fresas', 'gomitas', 'chispas', 'brownie'],
  },
  'yogurt-toppings': {
    id: 'yogurt-toppings',
    titleKey: 'modifiers.groups.yogurtToppings.title',
    descriptionKey: 'modifiers.groups.yogurtToppings.description',
    selectionMode: 'multi',
    minSelections: 0,
    maxSelections: 4,
    freeIncluded: 4,
    optionIds: ['oreo', 'fresas', 'gomitas', 'chispas', 'brownie'],
  },
  'yogurt-sirope': {
    id: 'yogurt-sirope',
    titleKey: 'modifiers.groups.yogurtSirope.title',
    descriptionKey: 'modifiers.groups.yogurtSirope.description',
    selectionMode: 'single',
    minSelections: 1,
    maxSelections: 1,
    freeIncluded: 1,
    optionIds: ['sirope-fresa', 'sirope-chocolate'],
  },
  'yogurt-type': {
    id: 'yogurt-type',
    titleKey: 'modifiers.groups.yogurtType.title',
    descriptionKey: 'modifiers.groups.yogurtType.description',
    selectionMode: 'single',
    minSelections: 1,
    maxSelections: 1,
    freeIncluded: 1,
    optionIds: ['yogurt-light', 'yogurt-normal'],
  },
};

export function getModifierOptionById(id: string): ModifierOption | undefined {
  return mockModifierOptions.find((option) => option.id === id);
}

/** @deprecated Use getModifierOptionById */
export function getToppingById(id: string): ModifierOption | undefined {
  return getModifierOptionById(id);
}

export function getModifierGroup(groupId: string): ModifierGroup | undefined {
  return mockModifierGroups[groupId];
}

export function getOptionsForGroup(groupId: string): ModifierOption[] {
  const group = getModifierGroup(groupId);
  if (!group) {
    return [];
  }
  return group.optionIds
    .map((id) => getModifierOptionById(id))
    .filter((option): option is ModifierOption => option !== undefined);
}

/** @deprecated Use getOptionsForGroup */
export function getToppingsForGroup(groupId: string): ModifierOption[] {
  return getOptionsForGroup(groupId);
}

