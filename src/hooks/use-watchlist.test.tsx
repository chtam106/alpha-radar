import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchlist } from './use-watchlist';

const STORAGE_KEY = 'crypto-dashboard:watchlist';

describe('useWatchlist', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes and deduplicates saved symbols before exposing them', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([' btcusdt ', 'BTCUSDT', '', 'ethusdc'])
    );

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual(['BTCUSDT', 'ETHUSDC']);
    expect(result.current.isWatchlisted('btcusdt')).toBe(true);
  });

  it('adds and removes a symbol using a case-insensitive toggle', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => result.current.toggleWatchlist('btcusdt'));
    expect(result.current.watchlist).toEqual(['BTCUSDT']);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('["BTCUSDT"]');

    act(() => result.current.toggleWatchlist('BtcUsdt'));
    expect(result.current.watchlist).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('synchronizes matching storage events and ignores other keys', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'unrelated-key',
          newValue: JSON.stringify(['IGNORED'])
        })
      );
    });
    expect(result.current.watchlist).toEqual([]);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(['solusdt'])
        })
      );
    });
    expect(result.current.watchlist).toEqual(['SOLUSDT']);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
    });
    expect(result.current.watchlist).toEqual([]);
  });

  it('recovers from invalid persisted JSON and reports the corrupted value', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.localStorage.setItem(STORAGE_KEY, '{not json');

    const { result } = renderHook(() => useWatchlist());

    expect(result.current.watchlist).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unable to parse the saved watchlist.',
      expect.any(SyntaxError)
    );
  });
});
