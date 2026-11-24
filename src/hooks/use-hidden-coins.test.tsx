import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHiddenCoins } from './use-hidden-coins';

const STORAGE_KEY = 'crypto-dashboard:hidden-coins';

describe('useHiddenCoins', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes and deduplicates saved symbols', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([' btcusdt ', 'BTCUSDT', '', 'ethusdc'])
    );

    const { result } = renderHook(() => useHiddenCoins());

    expect(result.current.hiddenCoins).toEqual(['BTCUSDT', 'ETHUSDC']);
    expect(result.current.isHidden('btcusdt')).toBe(true);
  });

  it('hides and unhides a coin persistently', () => {
    const { result } = renderHook(() => useHiddenCoins());

    act(() => result.current.hideCoin('btcusdt'));
    expect(result.current.hiddenCoins).toEqual(['BTCUSDT']);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('["BTCUSDT"]');

    act(() => result.current.unhideCoin('BtcUsdt'));
    expect(result.current.hiddenCoins).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('unhides all saved coins', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['BTCUSDT', 'ETHUSDT']));
    const { result } = renderHook(() => useHiddenCoins());

    act(() => result.current.clearHiddenCoins());

    expect(result.current.hiddenCoins).toEqual([]);
    expect(result.current.feedback).toBe('cleared');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('does not change hidden state when saving fails', () => {
    const { result } = renderHook(() => useHiddenCoins());
    const error = new Error('Storage unavailable');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw error;
    });

    try {
      act(() => result.current.hideCoin('BTCUSDT'));
      expect(result.current.hiddenCoins).toEqual([]);
      expect(result.current.feedback).toBe('error');
      expect(errorSpy).toHaveBeenCalledWith('Unable to save the hidden coins.', error);
    } finally {
      storageSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('synchronizes hidden symbols from storage events', () => {
    const { result } = renderHook(() => useHiddenCoins());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(['solusdt'])
        })
      );
    });

    expect(result.current.hiddenCoins).toEqual(['SOLUSDT']);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
    });

    expect(result.current.hiddenCoins).toEqual([]);
  });
});
