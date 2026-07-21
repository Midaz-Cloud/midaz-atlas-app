import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import { resolveAppliedModifiersFromSelections } from '../resolveAppliedModifiers';

const groups: ProductModifierGroup[] = [
  {
    id: 'grp-1',
    name: 'Agregados',
    isRequired: false,
    minSelection: 0,
    maxSelection: 3,
    quotaFree: 0,
    quotaFreeBySize: null,
    excessPrice: 0,
    sortOrder: 0,
    options: [
      { id: 'opt-a', name: 'A', additionalPrice: 2, sortOrder: 0 },
      { id: 'opt-b', name: 'B', additionalPrice: 1, sortOrder: 1 },
    ],
  },
];

describe('resolveAppliedModifiersFromSelections', () => {
  it('computes surcharge per unit line from option quantities', () => {
    const result = resolveAppliedModifiersFromSelections(groups, [
      {
        groupId: 'grp-1',
        options: [
          { optionId: 'opt-a', quantity: 2 },
          { optionId: 'opt-b', quantity: 1 },
        ],
      },
    ]);
    expect(result.appliedModifiers).toHaveLength(2);
    expect(result.surcharge).toBe(5);
  });
});
