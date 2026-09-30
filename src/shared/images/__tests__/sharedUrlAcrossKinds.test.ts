import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const files = new Set<string>();
const mockFs = {
  dirs: { DocumentDir: '/docs' },
  isDir: jest.fn(async () => true),
  mkdir: jest.fn(async () => undefined),
  exists: jest.fn(async (p: string) => files.has(p)),
  unlink: jest.fn(async (p: string) => {
    files.delete(p);
  }),
  writeFile: jest.fn(async () => undefined),
};

jest.mock('../blobUtilLazy', () => ({
  getBlobUtilModule: () => ({ fs: mockFs }),
  isKioskImageDiskCacheAvailable: () => true,
}));

// eslint-disable-next-line import/first
import { clearKioskImageCache, syncKioskImagesStrict } from '../kioskImageCache';

const URL_SHARED = 'https://cdn.example.com/uploads/colita.png';

describe('misma foto como producto y como categoría', () => {
  const download = jest.fn(async (_url: string, dest: string) => {
    files.add(dest);
    return 1000;
  });

  beforeEach(async () => {
    files.clear();
    download.mockClear();
    mockFs.unlink.mockClear();
    await AsyncStorage.clear();
    (NativeModules as Record<string, unknown>).KioskDeviceModule = { downloadToFile: download };
    await clearKioskImageCache();
    mockFs.unlink.mockClear();
  });

  afterAll(() => {
    delete (NativeModules as Record<string, unknown>).KioskDeviceModule;
  });

  it('se baja una sola vez y ningún uso borra el archivo del otro, arranque tras arranque', async () => {
    const entries = [
      { url: URL_SHARED, kind: 'categories' as const },
      { url: URL_SHARED, kind: 'products' as const },
    ];

    await syncKioskImagesStrict(entries);
    expect(download).toHaveBeenCalledTimes(1);
    expect(files.size).toBe(1);

    // "Arranques" siguientes, con la URL pedida con el otro tipo primero.
    for (let run = 0; run < 3; run += 1) {
      await syncKioskImagesStrict([...entries].reverse());
      await syncKioskImagesStrict([{ url: URL_SHARED, kind: 'products' }]);
    }

    expect(download).toHaveBeenCalledTimes(1);
    expect(mockFs.unlink).not.toHaveBeenCalledWith([...files][0]);
    expect(files.size).toBe(1);
  });
});
