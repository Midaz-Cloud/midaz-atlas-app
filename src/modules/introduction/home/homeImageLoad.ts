export type HomeImageLoadState = 'missing' | 'loading' | 'loaded' | 'error';

export type HomeImageLoadReport = {
  state: HomeImageLoadState;
  url: string | null;
  relativePath: string | null;
};

export function homeImageStatusLabel(state: HomeImageLoadState): string {
  switch (state) {
    case 'missing':
      return 'Sin imagen en config';
    case 'loading':
      return 'Cargando…';
    case 'loaded':
      return 'Cargada OK';
    case 'error':
      return 'Error al cargar';
  }
}

export function homeImageStatusIsProblem(state: HomeImageLoadState): boolean {
  return state === 'missing' || state === 'loading' || state === 'error';
}
