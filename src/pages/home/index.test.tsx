import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaToken } from '@/services/binance-alpha';

const fetchBscAlphaTokensMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/binance-alpha', () => ({
  fetchBscAlphaTokens: fetchBscAlphaTokensMock
}));

import { HomePage } from './index';

const tokens: BscAlphaToken[] = [
  {
    tokenId: 'alpha',
    name: 'Alpha Token',
    symbol: 'ALPHA',
    futuresSymbol: 'ALPHAUSDT',
    contractAddress: '0xalpha',
    cmcSlug: 'alpha-token',
    iconUrl: null,
    price: 0.1,
    marketCap: 100,
    fdv: 500,
    circulatingSupply: 200,
    totalSupply: 1_000_000_000,
    unlockedPercent: 20
  },
  {
    tokenId: 'beta',
    name: 'Beta Token',
    symbol: 'BETA',
    futuresSymbol: 'BETAUSDT',
    contractAddress: '0xbeta',
    cmcSlug: 'beta-token',
    iconUrl: null,
    price: 0.2,
    marketCap: 200,
    fdv: 2_000,
    circulatingSupply: 3_500,
    totalSupply: 10_000_000_000,
    unlockedPercent: 35
  }
];

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

function getVisibleSymbols(): string[] {
  return Array.from(
    screen.getByRole('table').querySelectorAll<HTMLTableRowElement>('tbody tr[data-futures-symbol]')
  ).map((row) => row.dataset.futuresSymbol ?? '');
}

describe('Home page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchBscAlphaTokensMock.mockReset();
  });

  it('sorts tokens, filters supply, and toggles the sort direction', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table', {
      name: /listed in futures but not spot/i
    });
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
    expect(screen.getByText('2 coins match')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /market cap/i }));
    expect(getVisibleSymbols()).toEqual(['BETAUSDT', 'ALPHAUSDT']);
    expect(window.localStorage.getItem('crypto-dashboard:sort-preference')).toBe('marketCap:desc');

    const supplyGroup = screen.getByRole('group', { name: 'Filter by total supply' });
    fireEvent.click(within(supplyGroup).getByRole('button', { name: '1B' }));
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    expect(screen.getByText('1 of 2 coins match')).toBeInTheDocument();

    const unlockGroup = screen.getByRole('group', { name: 'Filter by maximum unlock' });
    fireEvent.click(within(unlockGroup).getByRole('button', { name: '20%' }));
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    fireEvent.click(within(supplyGroup).getByRole('button', { name: 'All' }));
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
  });

  it('restores saved sorting and refreshes the API data', async () => {
    window.localStorage.setItem('crypto-dashboard:sort-preference', 'fdv:desc');
    fetchBscAlphaTokensMock.mockResolvedValueOnce(tokens).mockResolvedValueOnce([tokens[0]]);
    renderHome();

    await screen.findByRole('table');
    expect(getVisibleSymbols()).toEqual(['BETAUSDT', 'ALPHAUSDT']);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetchBscAlphaTokensMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']));
  });

  it('opens the row context menu on right-click and adds then removes a watchlist entry', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const alphaRow = screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' });
    fireEvent.contextMenu(alphaRow, { clientX: 120, clientY: 180 });

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Add to watchlist' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('["ALPHAUSDT"]');
    });

    fireEvent.contextMenu(alphaRow, { clientX: 120, clientY: 180 });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove from watchlist' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('[]');
    });
  });

  it('shows API failures and clears the loading state instead of leaving a blank page', async () => {
    fetchBscAlphaTokensMock.mockRejectedValue(new Error('Binance API returned HTTP 503.'));
    renderHome();

    expect(await screen.findByText('Binance API returned HTTP 503.')).toBeInTheDocument();
    expect(screen.getByText('Count unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Loading Binance Alpha tokens…')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Binance API returned HTTP 503.');
  });

  it('shows an explicit empty state when the API returns no eligible tokens', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue([]);
    renderHome();

    expect(await screen.findByText('No matching tokens found')).toBeInTheDocument();
    expect(
      screen.getByText('No active BSC Alpha tokens currently meet the 35% unlock threshold.')
    ).toBeInTheDocument();
  });
});
