import { useCallback, useEffect, useState } from 'react';

import { createKioskApiClient, loadBanks, type KioskBank } from '@shared/api/kiosk';
import { loadAccessToken } from '@shared/api/kiosk/tokenStorage';

export function useKioskBanks() {
  const [banks, setBanks] = useState<KioskBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await loadAccessToken();
      const client = createKioskApiClient(token ?? undefined);
      const list = await loadBanks(client);
      setBanks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading banks');
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { banks, loading, error, reload };
}
