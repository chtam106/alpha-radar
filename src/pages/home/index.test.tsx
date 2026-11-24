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

async function waitForFiltering() {
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Filtering tokens' })).toBeNull()
  );
}

describe('Home page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchBscAlphaTokensMock.mockReset();
  });

  it('keeps the filter loading dialog visible for at least 600 ms', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();
    await screen.findByRole('table');

    vi.useFakeTimers();
    try {
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Filter by total supply' })).getByRole('button', {
          name: '1B'
        })
      );
      expect(screen.getByRole('dialog', { name: 'Filtering tokens' })).toBeVisible();
      act(() => vi.advanceTimersByTime(599));
      expect(screen.getByRole('dialog', { name: 'Filtering tokens' })).toBeVisible();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByRole('dialog', { name: 'Filtering tokens' })).not.toBeInTheDocument();
      expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    } finally {
      vi.useRealTimers();
    }
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
    vi.useFakeTimers();
    try {
      const supplyGroup = screen.getByRole('group', { name: 'Filter by total supply' });
      const oneB = within(supplyGroup).getByRole('button', { name: '1B' });

      fireEvent.click(oneB);
      expect(oneB).toHaveAttribute('aria-pressed', 'true');
      const dialog = screen.getByRole('dialog', { name: 'Filtering tokens' });
      expect(within(dialog).getByRole('progressbar', { name: 'Filtering tokens' })).toBeVisible();
      expect(dialog.textContent).toBe('');
      expect(
        screen
          .getByRole('table', { hidden: true })
          .querySelectorAll('tbody tr[data-futures-symbol]')
      ).toHaveLength(2);

      act(() => vi.advanceTimersByTime(600));
      expect(screen.getByRole('dialog', { name: 'Filtering tokens' })).toBeVisible();
      tableRenderGate.promise = null;
      await act(async () => resolveRender());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    } finally {
      tableRenderGate.promise = null;
      resolveRender();
      vi.useRealTimers();
    }
  });

  it('shows the loading dialog while changing or resetting the unlock filter', async () => {
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
    function holdTable() {
      tableRenderGate.promise = new Promise<void>((resolve) => {
        resolveRender = resolve;
      });
    }

    try {
      holdTable();
      fireEvent.keyDown(screen.getByRole('slider', { name: 'Minimum unlock' }), {
        key: 'ArrowRight'
      });
      expect(screen.getByRole('dialog', { name: 'Filtering tokens' })).toBeVisible();
      tableRenderGate.promise = null;
      await act(async () => resolveRender());
      await waitForFiltering();
      expect(screen.getByRole('slider', { name: 'Minimum unlock' })).toHaveValue('5');

      holdTable();
      fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
      expect(screen.getByRole('dialog', { name: 'Filtering tokens' })).toBeVisible();
      tableRenderGate.promise = null;
      await act(async () => resolveRender());
      await waitForFiltering();
      expect(screen.getByRole('slider', { name: 'Minimum unlock' })).toHaveValue('0');
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
    await waitForFiltering();
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    expect(screen.getByText('1 of 2 coins match')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: 'Maximum unlock' }), {
      target: { value: '20' }
    });
    await waitForFiltering();
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
    fireEvent.click(within(supplyGroup).getByRole('button', { name: 'All' }));
    await waitForFiltering();
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
    await waitForFiltering();
    expect(getVisibleSymbols()).toEqual(['MINUSDT', 'THIRTYUSDT', 'MAXUSDT']);
    expect(screen.getByText('3 of 5 coins match')).toBeInTheDocument();

    const maxUnlock = screen.getByRole('slider', { name: 'Maximum unlock' });
    expect(maxUnlock).toHaveValue('35');
    fireEvent.change(maxUnlock, { target: { value: '20' } });
    await waitForFiltering();
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
    await waitForFiltering();
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);

    fireEvent.change(minUnlock, { target: { value: '25' } });
    await waitForFiltering();
    expect(minUnlock).toHaveValue('20');
    expect(maxUnlock).toHaveValue('20');
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);

    fireEvent.change(minUnlock, { target: { value: '0' } });
    await waitForFiltering();
    fireEvent.change(maxUnlock, { target: { value: '0' } });
    await waitForFiltering();
    expect(maxUnlock).toHaveValue('5');
    fireEvent.change(maxUnlock, { target: { value: '35' } });
    await waitForFiltering();
    fireEvent.change(minUnlock, { target: { value: '35' } });
    await waitForFiltering();
    expect(minUnlock).toHaveValue('30');
  });

  it('moves unlock limits in 5% steps with the keyboard', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const minUnlock = screen.getByRole('slider', { name: 'Minimum unlock' });
    const maxUnlock = screen.getByRole('slider', { name: 'Maximum unlock' });
    fireEvent.keyDown(minUnlock, { key: 'ArrowRight' });
    await waitForFiltering();
    fireEvent.keyDown(maxUnlock, { key: 'ArrowLeft' });
    await waitForFiltering();
    expect(minUnlock).toHaveValue('5');
    expect(maxUnlock).toHaveValue('30');
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
  });

  it('highlights the selected unlock endpoints as they change', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const unlockGroup = within(screen.getByRole('group', { name: 'Filter by unlocked range' }));
    const selectedClass = 'p-crypto-dashboard__unlock-mark-value--selected';
    expect(unlockGroup.getByText('0%')).toHaveClass(selectedClass);
    expect(unlockGroup.getByText('35%')).toHaveClass(selectedClass);
    expect(unlockGroup.getByText('5%')).not.toHaveClass(selectedClass);
    expect(unlockGroup.getByText('10%').parentElement).not.toHaveClass('MuiSlider-markLabelActive');

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Minimum unlock' }), {
      key: 'ArrowRight'
    });
    expect(unlockGroup.getByText('0%')).not.toHaveClass(selectedClass);
    expect(unlockGroup.getByText('5%')).toHaveClass(selectedClass);
    expect(unlockGroup.getByText('10%').parentElement).not.toHaveClass('MuiSlider-markLabelActive');
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
    await waitForFiltering();
    fireEvent.change(screen.getByRole('slider', { name: 'Minimum unlock' }), {
      target: { value: '15' }
    });
    await waitForFiltering();
    fireEvent.change(screen.getByRole('slider', { name: 'Maximum unlock' }), {
      target: { value: '30' }
    });
    await waitForFiltering();

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
    await waitForFiltering();
    fireEvent.change(screen.getByRole('slider', { name: 'Minimum unlock' }), {
      target: { value: '15' }
    });
    await waitForFiltering();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitForFiltering();

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

  it('shows a loading dialog during refresh and closes it when new data arrives', async () => {
    let resolveRefresh: (value: BscAlphaToken[]) => void = () => {};
    fetchBscAlphaTokensMock.mockResolvedValueOnce(tokens).mockImplementationOnce(
      () =>
        new Promise<BscAlphaToken[]>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    renderHome();
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    const dialog = screen.getByRole('dialog', { name: 'Refreshing tokens' });
    expect(within(dialog).getByRole('progressbar', { name: 'Refreshing tokens' })).toBeVisible();
    expect(dialog.textContent).toBe('');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(dialog).toBeVisible();

    await act(async () => resolveRefresh([tokens[0]]));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT']);
  });

  it('closes the refresh dialog and shows an error when refresh fails', async () => {
    let rejectRefresh: (reason: Error) => void = () => {};
    fetchBscAlphaTokensMock.mockResolvedValueOnce(tokens).mockImplementationOnce(
      () =>
        new Promise<BscAlphaToken[]>((_, reject) => {
          rejectRefresh = reject;
        })
    );
    renderHome();
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByRole('dialog', { name: 'Refreshing tokens' })).toBeVisible();
    await act(async () => rejectRefresh(new Error('Refresh failed.')));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh failed.');
    expect(getVisibleSymbols()).toEqual(['ALPHAUSDT', 'BETAUSDT']);
  });

  it('opens the row context menu on right-click and adds then removes a watchlist entry', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const alphaRow = screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' });
    fireEvent.contextMenu(alphaRow, { clientX: 120, clientY: 180 });

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Add to watchlist' }));
    expect(screen.getByRole('dialog', { name: 'Added to watchlist' })).toBeVisible();
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('["ALPHAUSDT"]');
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 2500
    });
    fireEvent.contextMenu(alphaRow, { clientX: 120, clientY: 180 });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove from watchlist' }));
    expect(screen.getByRole('dialog', { name: 'Removed from watchlist' })).toBeVisible();
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('[]');
    });
  });

  it('hides a coin from Home and saves it for the hidden coins route', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue(tokens);
    renderHome();

    await screen.findByRole('table');
    const alphaRow = screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' });
    fireEvent.contextMenu(alphaRow, { clientX: 120, clientY: 180 });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide from home' }));
    expect(screen.getByRole('dialog', { name: 'Hidden from Home' })).toBeVisible();

    expect(window.localStorage.getItem('crypto-dashboard:hidden-coins')).toBe('["ALPHAUSDT"]');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 2500
    });
    expect(screen.queryByRole('row', { name: 'Open ALPHAUSDT actions menu' })).not.toBeInTheDocument();
    expect(getVisibleSymbols()).toEqual(['BETAUSDT']);
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
