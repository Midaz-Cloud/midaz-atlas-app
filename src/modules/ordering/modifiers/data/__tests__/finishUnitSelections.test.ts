import {
  finishUnitSelectionsFromWizard,
  groupSelectionFromQuantities,
} from '../mockModifierFlows';

describe('finishUnitSelectionsFromWizard', () => {
  it('returns one modifier selection set per product unit', () => {
    const perUnit = finishUnitSelectionsFromWizard(
      {
        0: {
          toppings: groupSelectionFromQuantities('toppings', { oreo: 2 }),
        },
        1: {
          toppings: groupSelectionFromQuantities('toppings', { fresas: 1, oreo: 1 }),
        },
      },
      2,
    );

    expect(perUnit).toHaveLength(2);
    expect(perUnit[0][0].options).toEqual([{ optionId: 'oreo', quantity: 2 }]);
    expect(perUnit[1][0].options).toEqual([
      { optionId: 'fresas', quantity: 1 },
      { optionId: 'oreo', quantity: 1 },
    ]);
  });
});
