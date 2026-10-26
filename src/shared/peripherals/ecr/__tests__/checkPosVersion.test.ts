import {
  checkPosVersion,
  MIN_PKUSB_APP_VERSION_CODE,
  EXPECTED_VESLC_VERSION_CODE,
  posVersionCheckMessage,
} from '../checkPosVersion';

function ecrWithResponse(raw: string) {
  return { performVersionCheck: jest.fn().mockResolvedValue(raw) };
}

describe('checkPosVersion', () => {
  it('approves when both PKUSB and veslc match the pinned versions', async () => {
    const ecr = ecrWithResponse(
      JSON.stringify({
        success: true,
        type: 'version',
        result: 0,
        data: {
          appVersionName: '1.0.5',
          appVersionCode: MIN_PKUSB_APP_VERSION_CODE,
          veslcInstalled: true,
          veslcVersionName: 'VESLC20260819001',
          veslcVersionCode: EXPECTED_VESLC_VERSION_CODE,
        },
      }),
    );

    const result = await checkPosVersion(ecr);
    expect(result.ok).toBe(true);
  });

  it('approves PKUSB 1.0.8 (versionCode 17): newer than the minimum is fine', async () => {
    const ecr = ecrWithResponse(
      '{"success":true,"type":"version","result":0,"referenceNo":"VERCHK-1","data":{"veslcVersionCode":117,"veslcVersionName":"VESLC20260819001","veslcInstalled":true,"appVersionCode":17,"appVersionName":"1.0.8"},"crc":"00000000"}',
    );

    const result = await checkPosVersion(ecr);
    expect(result).toEqual({ ok: true, appVersionCode: 17, veslcVersionCode: 117 });
  });

  it('blocks when the PKUSB app version does not match', async () => {
    const ecr = ecrWithResponse(
      JSON.stringify({
        success: true,
        type: 'version',
        data: {
          appVersionCode: MIN_PKUSB_APP_VERSION_CODE - 1,
          veslcInstalled: true,
          veslcVersionCode: EXPECTED_VESLC_VERSION_CODE,
        },
      }),
    );

    const result = await checkPosVersion(ecr);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('mismatch');
    expect(posVersionCheckMessage(result)).toContain('Instale la versión correcta');
  });

  it('blocks when veslc is not installed on the terminal', async () => {
    const ecr = ecrWithResponse(
      JSON.stringify({
        success: true,
        type: 'version',
        data: {
          appVersionCode: MIN_PKUSB_APP_VERSION_CODE,
          veslcInstalled: false,
        },
      }),
    );

    const result = await checkPosVersion(ecr);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('veslc_missing');
  });

  it('blocks when the terminal never responds', async () => {
    const ecr = {
      performVersionCheck: jest.fn().mockRejectedValue(new Error('Timeout esperando respuesta del POS (8s)')),
    };

    const result = await checkPosVersion(ecr);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('no_response');
  });
});
