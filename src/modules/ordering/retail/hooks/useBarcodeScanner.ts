import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextInput, TextInputProps } from 'react-native';

import {
  hasScanTerminator,
  normalizeScanCode,
  stripScanTerminators,
} from '@shared/catalog/scanCode';

import { logRetailScan } from '../logRetailScan';

/** Ignore duplicate reads of the same scan (double Enter / idle + newline). */
const SCAN_DEBOUNCE_MS = 300;
/** Commit when scanner sends no suffix (some HID guns omit Enter). */
const SCAN_IDLE_MS = 120;

export type UseBarcodeScannerOptions = {
  onScan: (code: string) => void;
};

export type HiddenBarcodeInputProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onSubmitEditing'
  | 'autoFocus'
  | 'blurOnSubmit'
  | 'onBlur'
  | 'showSoftInputOnFocus'
  | 'autoCorrect'
  | 'autoCapitalize'
  | 'keyboardType'
  | 'importantForAutofill'
  | 'accessibilityElementsHidden'
  | 'importantForAccessibility'
  | 'testID'
>;

export type ScanCommitSource = 'newline' | 'submit' | 'idle';

export function useBarcodeScanner({ onScan }: UseBarcodeScannerOptions) {
  const inputRef = useRef<TextInput>(null);
  /** Source of truth — React state can lag one frame behind HID keystrokes. */
  const bufferRef = useRef('');
  const [buffer, setBuffer] = useState('');
  const lastScanAtRef = useRef(0);
  const lastCommittedCodeRef = useRef('');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearNativeInput = useCallback(() => {
    bufferRef.current = '';
    setBuffer('');
    inputRef.current?.setNativeProps({ text: '' });
  }, []);

  const commitScan = useCallback(
    (raw: string, source: ScanCommitSource) => {
      clearIdleTimer();

      const code = normalizeScanCode(raw);
      logRetailScan('HID input committed', {
        source,
        rawLength: raw.length,
        rawPreview: raw.length > 80 ? `${raw.slice(0, 80)}…` : raw,
        rawCharCodes: [...raw.slice(0, 48)].map((c) => c.charCodeAt(0)),
        normalizedCode: code || '(empty)',
        bufferRefLength: bufferRef.current.length,
        bufferRefPreview:
          bufferRef.current.length > 80
            ? `${bufferRef.current.slice(0, 80)}…`
            : bufferRef.current,
      });

      if (!code) {
        logRetailScan('scan ignored — empty after normalize');
        clearNativeInput();
        return;
      }

      const now = Date.now();
      if (
        code === lastCommittedCodeRef.current &&
        now - lastScanAtRef.current < SCAN_DEBOUNCE_MS
      ) {
        logRetailScan('scan ignored — duplicate debounce', {
          normalizedCode: code,
          msSinceLast: now - lastScanAtRef.current,
        });
        clearNativeInput();
        return;
      }

      lastScanAtRef.current = now;
      lastCommittedCodeRef.current = code;
      logRetailScan('scan dispatching to catalog lookup', { normalizedCode: code });
      onScan(code);
      clearNativeInput();
    },
    [clearIdleTimer, clearNativeInput, onScan],
  );

  const scheduleIdleCommit = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      const pending = bufferRef.current;
      if (!pending) {
        return;
      }
      logRetailScan('idle timeout — committing buffered scan', {
        bufferLength: pending.length,
        bufferPreview: pending.length > 80 ? `${pending.slice(0, 80)}…` : pending,
      });
      commitScan(pending, 'idle');
    }, SCAN_IDLE_MS);
  }, [clearIdleTimer, commitScan]);

  const handleChangeText = useCallback(
    (text: string) => {
      bufferRef.current = text;

      if (hasScanTerminator(text)) {
        commitScan(stripScanTerminators(text), 'newline');
        return;
      }

      setBuffer(text);
      scheduleIdleCommit();
    },
    [commitScan, scheduleIdleCommit],
  );

  const handleSubmitEditing = useCallback(() => {
    commitScan(bufferRef.current, 'submit');
  }, [commitScan]);

  const refocus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  const hiddenInputProps: HiddenBarcodeInputProps = {
    value: buffer,
    onChangeText: handleChangeText,
    onSubmitEditing: handleSubmitEditing,
    autoFocus: true,
    blurOnSubmit: false,
    onBlur: refocus,
    showSoftInputOnFocus: false,
    autoCorrect: false,
    autoCapitalize: 'none',
    keyboardType: 'visible-password',
    importantForAutofill: 'no',
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
    testID: 'barcode-scanner-input',
  };

  return { inputRef, hiddenInputProps, refocus };
}
