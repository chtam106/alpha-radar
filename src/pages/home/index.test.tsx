import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaToken } from '@/services/binance-alpha';

const fetchBscAlphaTokensMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/binance-alpha', () => ({
  fetchBscAlphaTokens: fetchBscAlphaTokensMock
}));

import { HomePage } from './index';

const FILTER_PREFERENCE_STORAGE_KEY = 'crypto-dashboard:filter-preference';

const tokens: BscAlphaToken[] = [
  {
    tokenId: 'alpha',
    name: 'Alpha Token',
    symbol: 'ALPHA',
    futuresSymbol: 'ALPHAUSDT',
    contractAddress: '0xalpha',
    liquidity: 100_000,
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
    liquidity: 200_000,
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
    expect(
      screen.getByRole('heading', { level: 1, name: 'Binance Alpha Futures Radar' })
    ).toBeVisible();
    expect(
      screen.getByText(
        /Built to find coins that have multiplied in value, like \$RAV, \$LAB, and \$BTW/
      )
    ).toBeInTheDocument();
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
    expect(screen.getByText('2 coins match')).toBeInTheDocument();

    const listStatus = screen
      .getByText('2 coins match')
      .closest('.p-crypto-dashboard__list-status');
    expect(listStatus).toContainElement(screen.getByText(/Updated/));
    expect(listStatus).toContainElement(screen.getByRole('button', { name: 'Reset filters' }));
    expect(listStatus).toContainElement(screen.getByRole('button', { name: 'Refresh' }));

    fireEvent.click(screen.getByRole('button', { name: 'MC' }));
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

  it('filters by minimum unlock and combines it with the maximum unlock', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue([
      {
        ...tokens[0],
        tokenId: 'unlock-zero',
        symbol: 'ZERO',
        futuresSymbol: 'ZEROUSDT',
        marketCap: 0,
        unlockedPercent: 0
      },
      {
        ...tokens[1],
        tokenId: 'unlock-below-minimum',
        symbol: 'BELOW',
        futuresSymbol: 'BELOWUSDT',
        marketCap: 1,
        unlockedPercent: 14.99
      },
      {
        ...tokens[0],
        tokenId: 'unlock-minimum',
        symbol: 'MIN',
        futuresSymbol: 'MINUSDT',
        marketCap: 2,
        unlockedPercent: 15
      },
      {
        ...tokens[1],
        tokenId: 'unlock-thirty',
        symbol: 'THIRTY',
        futuresSymbol: 'THIRTYUSDT',
        marketCap: 3,
        unlockedPercent: 30
      },
      {
        ...tokens[1],
        tokenId: 'unlock-max',
        symbol: 'MAX',
        futuresSymbol: 'MAXUSDT',
        marketCap: 4,
        unlockedPercent: 35
      }
    ]);
    renderHome();

    await screen.findByRole('table');
    expect(getVisibleSymbols()).toHaveLength(5);

    const minUnlockGroup = screen.getByRole('group', { name: 'Filter by minimum unlock' });
    expect(within(minUnlockGroup).getByRole('button', { name: '0%' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(within(minUnlockGroup).getByRole('button', { name: '15%' }));
    expect(getVisibleSymbols()).toEqual(['MINUSDT', 'THIRTYUSDT', 'MAXUSDT']);
    expect(screen.getByText('3 of 5 coins match')).toBeInTheDocument();

    const maxUnlockGroup = screen.getByRole('group', { name: 'Filter by maximum unlock' });
    expect(
      within(maxUnlockGroup)
        .getAllByRole('button')
        .map((button) => button.textContent?.trim())
    ).toEqual(['5%', '10%', '15%', '20%', '25%', '30%', '35%']);
    fireEvent.click(within(maxUnlockGroup).getByRole('button', { name: '20%' }));
    expect(getVisibleSymbols()).toEqual(['MINUSDT']);
  });

  it('resets the opposite unlock threshold when the selected range becomes invalid', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const minUnlockGroup = screen.getByRole('group', { name: 'Filter by minimum unlock' });
    const maxUnlockGroup = screen.getByRole('group', { name: 'Filter by maximum unlock' });

    fireEvent.click(within(maxUnlockGroup).getByRole('button', { name: '20%' }));
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);

    fireEvent.click(within(minUnlockGroup).getByRole('button', { name: '25%' }));
    expect(within(minUnlockGroup).getByRole('button', { name: '25%' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(maxUnlockGroup).getByRole('button', { name: '35%' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getVisibleSymbols()).toEqual(['BETAUSDT']);

    fireEvent.click(within(maxUnlockGroup).getByRole('button', { name: '20%' }));
    expect(within(minUnlockGroup).getByRole('button', { name: '0%' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(maxUnlockGroup).getByRole('button', { name: '20%' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
  });

  it('saves and restores total supply and unlock filters', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    const { unmount } = renderHome();

    await screen.findByRole('table');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
        name: '1B'
      })
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by minimum unlock' })).getByRole('button', {
        name: '15%'
      })
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by maximum unlock' })).getByRole('button', {
        name: '30%'
      })
    );

    const savedPreference = {
      totalSupplyFilters: [1_000_000_000],
      minUnlockFilter: 15,
      maxUnlockFilter: 30
    };
    await waitFor(() => {
      expect(window.localStorage.getItem(FILTER_PREFERENCE_STORAGE_KEY)).toBe(
        JSON.stringify(savedPreference)
      );
    });

    unmount();
    renderHome();
    await screen.findByRole('table');

    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    expect(
      within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
        name: '1B'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Filter by minimum unlock' })).getByRole('button', {
        name: '15%'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Filter by maximum unlock' })).getByRole('button', {
        name: '30%'
      })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets all filters and persists the default filter preferences', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
        name: '1B'
      })
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by minimum unlock' })).getByRole('button', {
        name: '15%'
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
    expect(
      within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
        name: 'All'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Filter by minimum unlock' })).getByRole('button', {
        name: '0%'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Filter by maximum unlock' })).getByRole('button', {
        name: '35%'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(window.localStorage.getItem(FILTER_PREFERENCE_STORAGE_KEY)).toBe(
        JSON.stringify({
          totalSupplyFilters: [],
          minUnlockFilter: 0,
          maxUnlockFilter: 35
        })
      );
    });
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
