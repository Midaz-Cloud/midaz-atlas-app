import {
  getFlowGroupCount,
  getGroupForFlow,
  selectionsToModifierSelections,
  unitSelectionsToModifierSelections,
} from '../mockModifierFlows';

describe('mockModifierFlows', () => {
  it('yogurt flow has three groups', () => {
    expect(getFlowGroupCount('yogurt-flow')).toBe(3);
    expect(getGroupForFlow('yogurt-flow', 0)?.id).toBe('yogurt-toppings');
  });

  it('selectionsToModifierSelections omits empty groups', () => {
    const result = selectionsToModifierSelections({
      'yogurt-sirope': { 'sirope-fresa': 1 },
      'yogurt-type': {},
    });
    expect(result).toEqual([
      {
        groupId: 'yogurt-sirope',
        options: [{ optionId: 'sirope-fresa', quantity: 1 }],
      },
    ]);
  });

  it('unitSelectionsToModifierSelections maps unit record', () => {
    const result = unitSelectionsToModifierSelections({
      'yogurt-type': {
        groupId: 'yogurt-type',
        options: [{ optionId: 'yogurt-light', quantity: 1 }],
      },
    });
    expect(result[0].options[0].optionId).toBe('yogurt-light');
  });
});
