import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Suspense, type ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaToken } from '@/services/binance-alpha';

const fetchBscAlphaTokensMock = vi.hoisted(() => vi.fn());
const tableRenderGate = vi.hoisted(() => ({ promise: null as Promise<void> | null }));

vi.mock('@/services/binance-alpha', () => ({
  fetchBscAlphaTokens: fetchBscAlphaTokensMock
}));

vi.mock('@/components/organisms/token-table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/organisms/token-table')>();
  return {
    ...actual,
    TokenTable: (props: ComponentProps<typeof actual.TokenTable>) => {
      if (tableRenderGate.promise) throw tableRenderGate.promise;
      return <actual.TokenTable {...props} />;
    }
  };
});

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

  it('updates supply selections immediately while results are pending', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    render(
      <MemoryRouter>
        <Suspense fallback="Loading results">
          <HomePage />
        </Suspense>
      </MemoryRouter>
    );
    await screen.findByRole('table');

    let resolveRender = () => {};
    tableRenderGate.promise = new Promise<void>((resolve) => {
      resolveRender = resolve;
    });
    try {
      const supplyGroup = screen.getByRole('group', { name: 'Filter by total supply' });
      const all = within(supplyGroup).getByRole('button', { name: 'All' });
      const oneB = within(supplyGroup).getByRole('button', { name: '1B' });
      const tenB = within(supplyGroup).getByRole('button', { name: '10B' });

      fireEvent.click(oneB);
      expect(oneB).toHaveAttribute('aria-pressed', 'true');
      expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
      fireEvent.click(tenB);
      expect(tenB).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(all);
      expect(all).toHaveAttribute('aria-pressed', 'true');
      expect(oneB).toHaveAttribute('aria-pressed', 'false');
      expect(tenB).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(tenB);
      expect(tenB).toHaveAttribute('aria-pressed', 'true');

      tableRenderGate.promise = null;
      await act(async () => resolveRender());
      expect(getVisibleSymbols()).toEqual(['BETAUSDT']);
    } finally {
      tableRenderGate.promise = null;
      resolveRender();
    }
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

    fireEvent.change(screen.getByRole('slider', { name: 'Maximum unlock' }), {
      target: { value: '20' }
    });
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

    const minUnlock = screen.getByRole('slider', { name: 'Minimum unlock' });
    expect(minUnlock).toHaveValue('0');
    fireEvent.change(minUnlock, { target: { value: '15' } });
    expect(getVisibleSymbols()).toEqual(['MINUSDT', 'THIRTYUSDT', 'MAXUSDT']);
    expect(screen.getByText('3 of 5 coins match')).toBeInTheDocument();

    const maxUnlock = screen.getByRole('slider', { name: 'Maximum unlock' });
    expect(maxUnlock).toHaveValue('35');
    fireEvent.change(maxUnlock, { target: { value: '20' } });
    expect(getVisibleSymbols()).toEqual(['MINUSDT']);
    expect(minUnlock).toHaveValue('15');
    expect(maxUnlock).toHaveValue('20');
  });

  it('keeps slider bounds valid and allows an equal minimum and maximum', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const minUnlock = screen.getByRole('slider', { name: 'Minimum unlock' });
    const maxUnlock = screen.getByRole('slider', { name: 'Maximum unlock' });
    fireEvent.change(maxUnlock, { target: { value: '20' } });
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);

    fireEvent.change(minUnlock, { target: { value: '25' } });
    expect(minUnlock).toHaveValue('20');
    expect(maxUnlock).toHaveValue('20');
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);

    fireEvent.change(minUnlock, { target: { value: '0' } });
    fireEvent.change(maxUnlock, { target: { value: '0' } });
    expect(maxUnlock).toHaveValue('5');
    fireEvent.change(maxUnlock, { target: { value: '35' } });
    fireEvent.change(minUnlock, { target: { value: '35' } });
    expect(minUnlock).toHaveValue('30');
  });

  it('moves unlock limits in 5% steps with the keyboard', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const minUnlock = screen.getByRole('slider', { name: 'Minimum unlock' });
    const maxUnlock = screen.getByRole('slider', { name: 'Maximum unlock' });
    fireEvent.keyDown(minUnlock, { key: 'ArrowRight' });
    fireEvent.keyDown(maxUnlock, { key: 'ArrowLeft' });
    expect(minUnlock).toHaveValue('5');
    expect(maxUnlock).toHaveValue('30');
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
    fireEvent.change(screen.getByRole('slider', { name: 'Minimum unlock' }), {
      target: { value: '15' }
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Maximum unlock' }), {
      target: { value: '30' }
    });

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
    expect(screen.getByRole('slider', { name: 'Minimum unlock' })).toHaveValue('15');
    expect(screen.getByRole('slider', { name: 'Maximum unlock' })).toHaveValue('30');
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
    fireEvent.change(screen.getByRole('slider', { name: 'Minimum unlock' }), {
      target: { value: '15' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
    expect(
      within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
        name: 'All'
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: 'Minimum unlock' })).toHaveValue('0');
    expect(screen.getByRole('slider', { name: 'Maximum unlock' })).toHaveValue('35');
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
