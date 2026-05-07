import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMediaQuery } from '../../src/shared/hooks/useMediaQuery';

type MQListener = (e: { matches: boolean }) => void;

function mockMatchMedia(matches: boolean) {
  let listener: MQListener | null = null;
  const mql = {
    matches,
    media: '',
    addEventListener: (_: string, cb: MQListener) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    fire: (m: boolean) => {
      mql.matches = m;
      listener?.({ matches: m });
    },
  };
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the initial match value', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const ctrl = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
    act(() => ctrl.fire(true));
    expect(result.current).toBe(true);
  });
});
