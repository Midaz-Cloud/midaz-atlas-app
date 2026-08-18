import { buildCloseSteps, closeStepIds } from '../buildCloseSteps';
import type { CloseStepLabels } from '../buildCloseSteps';

const LABELS: CloseStepLabels = {
  waiting_pos: 'Waiting POS',
  fiscal_z: 'Fiscal Z',
  printing: 'Printing',
  generating_doc: 'Generating Excel',
  sending_doc: 'Sending email',
};

describe('closeStepIds', () => {
  it('hides Excel and email steps when the opt-in flag is off', () => {
    expect(closeStepIds(false)).toEqual(['waiting_pos', 'fiscal_z', 'printing']);
  });

  it('includes Excel and email steps when the opt-in flag is on', () => {
    expect(closeStepIds(true)).toEqual([
      'waiting_pos',
      'fiscal_z',
      'printing',
      'generating_doc',
      'sending_doc',
    ]);
  });
});

describe('buildCloseSteps', () => {
  it('renders 1–3 only when Excel/mail is disabled (no skipped placeholders)', () => {
    const steps = buildCloseSteps(false, LABELS);
    expect(steps.map((step) => step.id)).toEqual([
      'waiting_pos',
      'fiscal_z',
      'printing',
    ]);
    expect(steps.some((step) => step.id === 'generating_doc')).toBe(false);
    expect(steps.some((step) => step.id === 'sending_doc')).toBe(false);
    expect(steps.every((step) => step.state === 'pending')).toBe(true);
  });

  it('includes all five steps when Excel/mail is enabled', () => {
    const steps = buildCloseSteps(true, LABELS);
    expect(steps.map((step) => step.id)).toEqual([
      'waiting_pos',
      'fiscal_z',
      'printing',
      'generating_doc',
      'sending_doc',
    ]);
    expect(steps[3]?.label).toBe('Generating Excel');
    expect(steps[4]?.label).toBe('Sending email');
  });
});
