import ReactTestRenderer, { act } from 'react-test-renderer';

import { KioskStartupErrorScreen, classifyStartupError } from '../KioskStartupErrorScreen';

describe('KioskStartupErrorScreen', () => {
  it('clasifica la causa por el código HTTP', () => {
    expect(classifyStartupError(401)).toBe('not_registered');
    expect(classifyStartupError(403)).toBe('blocked');
    expect(classifyStartupError(undefined)).toBe('unreachable');
    expect(classifyStartupError(500)).toBe('other');
  });

  it('muestra el serial del equipo y reintenta solo al vencer el contador', async () => {
    jest.useFakeTimers();
    const onRetry = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <KioskStartupErrorScreen
          message="Dispositivo no registrado (/auth/kiosk/login)"
          statusCode={401}
          deviceSerial="AF910S20250915040"
          autoRetrySeconds={3}
          onRetry={onRetry}
        />,
      );
    });

    const serial = renderer.root.findByProps({ testID: 'kiosk-session-auth-error-serial' });
    expect(serial.findAll((node) => node.props.children === 'AF910S20250915040').length).toBeGreaterThan(0);
    expect(renderer.root.findByProps({ testID: 'kiosk-session-auth-error-hint' })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(onRetry).toHaveBeenCalledTimes(1);

    // El toque manual también funciona.
    await act(async () => {
      renderer.root.findByProps({ testID: 'kiosk-session-auth-error-retry' }).props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(2);

    await act(async () => {
      renderer.unmount();
    });
    jest.useRealTimers();
  });

  it('sin serial (no se pudo leer) no muestra la caja del serial', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <KioskStartupErrorScreen message="x" deviceSerial={null} autoRetrySeconds={0} onRetry={jest.fn()} />,
      );
    });
    expect(renderer.root.findAllByProps({ testID: 'kiosk-session-auth-error-serial' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'kiosk-session-auth-error-countdown' })).toHaveLength(0);
    await act(async () => {
      renderer.unmount();
    });
  });
});
