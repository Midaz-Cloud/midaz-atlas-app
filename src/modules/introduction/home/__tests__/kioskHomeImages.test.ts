import liveConfigFixture from '@shared/api/kiosk/fixtures/live/config.response.json';
import { mapLiveConfigToKioskConfigResponse } from '@shared/api/kiosk/mappers/liveConfig';
import type { KioskConfigResponseLive } from '@shared/api/kiosk/liveApi.types';

import { resolveHomeCoverImageUrl, resolveHomeLogoImageUrl } from '../kioskHomeImages';

jest.mock('@shared/config/api', () => ({
  getKioskApiBaseUrl: () => 'http://10.182.5.14:3000',
  getKioskUploadsBaseUrl: () => 'http://10.182.5.14:3000',
}));

describe('kioskHomeImages', () => {
  const config = mapLiveConfigToKioskConfigResponse(
    liveConfigFixture as KioskConfigResponseLive,
  );

  it('builds cover URL from api base + appearance.coverImage', () => {
    expect(resolveHomeCoverImageUrl(config)).toBe(
      'http://10.182.5.14:3000/uploads/1779660683562-947537372.jpg',
    );
  });

  it('builds logo URL from api base + organization.logo', () => {
    expect(resolveHomeLogoImageUrl(config)).toBe(
      'http://10.182.5.14:3000/uploads/1779638366098-305832616.png',
    );
  });
});
