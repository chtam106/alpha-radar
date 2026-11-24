import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaToken } from '@/services/binance-alpha';

const fetchBscAlphaTokensMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/binance-alpha', () => ({
  fetchBscAlphaTokens: fetchBscAlphaTokensMock
}));

import { HiddenCoinsPage } from './index';

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

function renderHiddenCoins() {
  return render(
    <MemoryRouter initialEntries={['/hidden']}>
      <HiddenCoinsPage />
    </MemoryRouter>
  );
}

describe('Hidden coins page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchBscAlphaTokensMock.mockReset();
  });

  it('renders hidden coins in a table and restores one through its row menu', async () => {
    window.localStorage.setItem('crypto-dashboard:hidden-coins', '["ALPHAUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValue([alphaToken]);
    renderHiddenCoins();

    const table = await screen.findByRole('table', { name: 'Coins hidden from Home' });
    expect(within(table).getByText('ALPHA')).toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' }), {
      clientX: 160,
      clientY: 220
    });
    expect(await screen.findByRole('menuitem', { name: 'Show on home' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Add to watchlist' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Show on home' }));
    expect(screen.getByRole('dialog', { name: 'Restored to Home' })).toBeVisible();

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Restored to Home' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('No hidden coins')).toBeInTheDocument();
    expect(window.localStorage.getItem('crypto-dashboard:hidden-coins')).toBe('[]');
  });

  it('keeps hidden coins visible with fallback data when the API no longer lists them', async () => {
    window.localStorage.setItem('crypto-dashboard:hidden-coins', '["OLDUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValue([]);
    renderHiddenCoins();

    const table = await screen.findByRole('table', { name: 'Coins hidden from Home' });
    expect(within(table).getByText('OLD')).toBeInTheDocument();
    fireEvent.contextMenu(screen.getByRole('row', { name: 'Open OLDUSDT actions menu' }), {
      clientX: 160,
      clientY: 220
    });
    expect(await screen.findByRole('menuitem', { name: 'Show on home' })).toBeInTheDocument();
  });

  it('confirms before unhiding all coins', async () => {
    window.localStorage.setItem('crypto-dashboard:hidden-coins', '["ALPHAUSDT"]');
    fetchBscAlphaTokensMock.mockResolvedValue([alphaToken]);
    renderHiddenCoins();

    await screen.findByRole('table', { name: 'Coins hidden from Home' });
    fireEvent.click(screen.getByRole('button', { name: 'Unhide all' }));
    const confirmation = screen.getByRole('dialog', { name: 'Unhide all hidden coins?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.localStorage.getItem('crypto-dashboard:hidden-coins')).toBe('["ALPHAUSDT"]');

    fireEvent.click(screen.getByRole('button', { name: 'Unhide all' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Unhide all hidden coins?' })).getByRole('button', {
        name: 'Unhide all'
      })
    );

    expect(screen.getByRole('dialog', { name: 'All coins restored to Home' })).toBeVisible();
    expect(window.localStorage.getItem('crypto-dashboard:hidden-coins')).toBe('[]');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 2500
    });
    expect(await screen.findByText('No hidden coins')).toBeInTheDocument();
  });

  it('explains how to hide a coin when the list is empty', async () => {
    fetchBscAlphaTokensMock.mockResolvedValue([]);
    renderHiddenCoins();

    expect(await screen.findByText('No hidden coins')).toBeInTheDocument();
    expect(screen.getByText(/Hide a coin from its row menu on Home/)).toBeInTheDocument();
  });
});
