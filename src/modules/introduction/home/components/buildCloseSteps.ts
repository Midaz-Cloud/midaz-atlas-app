export type CloseStepId =
  | 'waiting_pos'
  | 'fiscal_z'
  | 'printing'
  | 'generating_doc'
  | 'sending_doc';

export type StepState = 'pending' | 'active' | 'done' | 'error' | 'skipped';

export type CloseStep = {
  id: CloseStepId;
  label: string;
  state: StepState;
  detail?: string;
};

export type CloseStepLabels = Record<CloseStepId, string>;

const ALWAYS_ON_STEP_IDS: CloseStepId[] = ['waiting_pos', 'fiscal_z', 'printing'];
const EXCEL_MAIL_STEP_IDS: CloseStepId[] = ['generating_doc', 'sending_doc'];

/** Excel generate + SMTP are opt-in; omit those steps when the flag is off. */
export function closeStepIds(excelMailEnabled: boolean): CloseStepId[] {
  return excelMailEnabled
    ? [...ALWAYS_ON_STEP_IDS, ...EXCEL_MAIL_STEP_IDS]
    : [...ALWAYS_ON_STEP_IDS];
}

export function buildCloseSteps(
  excelMailEnabled: boolean,
  labels: CloseStepLabels,
): CloseStep[] {
  return closeStepIds(excelMailEnabled).map((id) => ({
    id,
    label: labels[id],
    state: 'pending',
  }));
}
