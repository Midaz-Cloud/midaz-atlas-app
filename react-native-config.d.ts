declare module 'react-native-config' {
  export interface NativeConfig {
    KIOSK_DEMO_MODE?: string;
    KIOSK_DEMO_REFERENCE_CODE?: string;
    KIOSK_DEMO_SCENARIO?: string;
    KIOSK_DEMO_SHORT_TIMEOUTS?: string;
    KIOSK_API_BASE_URL?: string;
    KIOSK_UPLOADS_BASE_URL?: string;
    KIOSK_API_KEY?: string;
    KIOSK_API_USE_MOCK?: string;
    KIOSK_DEVICE_SERIAL_OVERRIDE?: string;
    KIOSK_ADMIN_PASSCODE?: string;
    KIOSK_QR_GENERATOR_URL?: string;
    KIOSK_TRACK_BASE_URL?: string;
    KIOSK_POS_TEST_CHARGE_VES?: string;
    KIOSK_FISCAL_SERVICE_URL?: string;
    KIOSK_FISCAL_MOCK?: string;
    KIOSK_PRINTER_MOCK?: string;
    KIOSK_SETTLEMENT_EXCEL_MAIL?: string;
    KIOSK_MAIL_MAILER?: string;
    KIOSK_MAIL_HOST?: string;
    KIOSK_MAIL_PORT?: string;
    KIOSK_MAIL_USERNAME?: string;
    KIOSK_MAIL_PASSWORD?: string;
    KIOSK_MAIL_ENCRYPTION?: string;
    KIOSK_MAIL_FROM_ADDRESS?: string;
    KIOSK_MAIL_FROM_NAME?: string;
    KIOSK_MAIL_TO?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
