import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent | { matches: boolean }) => {
      setMatches(e.matches);
    };
    setMatches(mql.matches);
    mql.addEventListener('change', onChange as (e: MediaQueryListEvent) => void);
    return () => {
      mql.removeEventListener('change', onChange as (e: MediaQueryListEvent) => void);
    };
  }, [query]);

  return matches;
}
