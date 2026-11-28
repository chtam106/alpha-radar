import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHiddenCoins } from '@/hooks/use-hidden-coins';
import { GlobalHeader } from './index';

function CurrentPath() {
  const { pathname } = useLocation();
  return <output>{pathname}</output>;
}

describe('GlobalHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows saved coin counts and updates them when coins are hidden in the same tab', () => {
    window.localStorage.setItem(
      'crypto-dashboard:watchlist',
      JSON.stringify(['BTCUSDT', 'ETHUSDT'])
    );
    window.localStorage.setItem('crypto-dashboard:hidden-coins', JSON.stringify(['SOLUSDT']));
    render(
      <MemoryRouter>
        <GlobalHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Watchlist (2 coins)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hidden (1 coin)' })).toBeInTheDocument();

    const { result } = renderHook(() => useHiddenCoins());
    act(() => result.current.hideCoin('BNBUSDT'));
    expect(screen.getByRole('link', { name: 'Hidden (2 coins)' })).toBeInTheDocument();

    act(() => result.current.clearHiddenCoins());
    expect(screen.getByRole('link', { name: 'Hidden' })).toBeInTheDocument();
  });

  it('uses the brand link for Home and marks the active Watchlist route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalHeader />
        <CurrentPath />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Alpha Radar' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).not.toHaveAttribute('aria-current');

    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }));
    expect(screen.getByText('/watchlist')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('link', { name: 'Alpha Radar' }));
    expect(screen.getByText('/')).toBeInTheDocument();
  });
});
