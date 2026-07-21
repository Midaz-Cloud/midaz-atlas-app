export type ImageCacheKind = 'config' | 'categories' | 'products' | 'modifiers';

export type ImageSyncEntry = {
  url: string;
  kind: ImageCacheKind;
};

export type ImageEnsureStatus = 'skipped' | 'downloaded' | 'failed';

export type ImageEnsureResult = {
  status: ImageEnsureStatus;
  url: string;
  kind: ImageCacheKind;
  localUri?: string;
  error?: string;
};

export type ImageSyncProgress = {
  done: number;
  total: number;
  skipped: number;
  downloaded: number;
  failed: number;
  remaining: number;
  currentUrl?: string;
};

export type ImageSyncSummary = {
  total: number;
  skipped: number;
  downloaded: number;
  failed: number;
  failedUrls: string[];
};
