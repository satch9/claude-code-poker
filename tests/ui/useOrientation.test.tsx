import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOrientation } from '../../src/shared/hooks/useOrientation';

function mockMatchMedia(landscapeMatches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('landscape') ? landscapeMatches : !landscapeMatches,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }));
}

describe('useOrientation', () => {
  it('returns "portrait" when not landscape', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe('portrait');
  });

  it('returns "landscape" when landscape media matches', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe('landscape');
  });
});
