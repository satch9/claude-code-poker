import { useMediaQuery } from './useMediaQuery';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const isLandscape = useMediaQuery('(orientation: landscape)');
  return isLandscape ? 'landscape' : 'portrait';
}
