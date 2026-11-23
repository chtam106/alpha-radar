import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaToken } from '@/services/binance-alpha';

const fetchBscAlphaTokensMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/binance-alpha', () => ({
  fetchBscAlphaTokens: fetchBscAlphaTokensMock
}));

import { WatchlistPage } from './index';

const alphaToken: BscAlphaToken = {
  tokenId: 'alpha',
  name: 'Alpha Token',
  symbol: 'ALPHA',
  futuresSymbol: 'ALPHAUSDT',
  contractAddress: '0xalpha',
  liquidity: 100_000,
  cmcSlug: 'alpha-token',
  iconUrl: 'https://example.com/alpha.png',
  price: 0.1,
  marketCap: 100,
  fdv: 500,
  circulatingSupply: 200,
  totalSupply: 1_000,
  unlockedPercent: 20
};

function renderWatchlist() {
  return render(
    <MemoryRouter initialEntries={['/watchlist']}>
      <WatchlistPage />
      <CurrentPath />
    </MemoryRouter>
  );
}

function CurrentPath() {
  const { pathname } = useLocation();
  return <output>{pathname}</output>;
}

describe('Watchlist page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchBscAlphaTokensMock.mockReset();
  });

  it('renders saved token data and removes it through the row context menu', async () => {
    window.localStorage.setItem('crypto-dashboard:watchlist', '["ALPHAUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValue([alphaToken]);
    renderWatchlist();

    const table = await screen.findByRole('table', { name: 'Saved futures watchlist' });
    expect(within(table).getByText('ALPHA')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Token')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' }), {
      clientX: 160,
      clientY: 220
    });
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('ALPHA')).toBeInTheDocument();
    expect(menu.querySelector('.m-token-context-menu__token-icon img')).toHaveAttribute(
      'src',
      'https://example.com/alpha.png'
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove from watchlist' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('[]');
    });
    expect(await screen.findByText('Your watchlist is empty')).toBeInTheDocument();
  });

  it('keeps saved pairs visible with fallback data when the API no longer lists a token', async () => {
    window.localStorage.setItem('crypto-dashboard:watchlist', '["OLDUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValue([]);
    renderWatchlist();

    const table = await screen.findByRole('table', { name: 'Saved futures watchlist' });
    expect(within(table).getByText('OLD')).toBeInTheDocument();
    expect(screen.queryByText('Not currently in the Alpha Radar')).not.toBeInTheDocument();
  });

  it('refreshes current data without removing a saved pair', async () => {
    window.localStorage.setItem('crypto-dashboard:watchlist', '["ALPHAUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValueOnce([alphaToken]).mockResolvedValueOnce([]);
    renderWatchlist();

    const table = await screen.findByRole('table', { name: 'Saved futures watchlist' });
    expect(within(table).getByText('ALPHA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetchBscAlphaTokensMock).toHaveBeenCalledTimes(2));
    expect(
      within(screen.getByRole('table', { name: 'Saved futures watchlist' })).getByText('ALPHA')
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('["ALPHAUSDT"]');
  });

  it('offers a route back to Home when the watchlist is empty', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue([]);
    renderWatchlist();

    expect(await screen.findByText('Your watchlist is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse Alpha Radar' }));
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('shows API errors while retaining the saved watchlist row', async () => {
    window.localStorage.setItem('crypto-dashboard:watchlist', '["ALPHAUSDT"]');
    fetchBscAlphaTokensMock.mockRejectedValue(new Error('CoinMarketCap proxy returned HTTP 502.'));
    renderWatchlist();

    expect(await screen.findByText('CoinMarketCap proxy returned HTTP 502.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Saved futures watchlist' })).getByText('ALPHA')
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading watchlist data…')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('CoinMarketCap proxy returned HTTP 502.');
  });
});
