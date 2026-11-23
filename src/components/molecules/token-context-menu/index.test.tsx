import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TokenContextMenu } from './index';

const token = {
  name: 'Alpha Token',
  futuresSymbol: 'ALPHA/USDT',
  coinMarketCapUrl: 'https://coinmarketcap.com/currencies/alpha-token/',
  isWatchlisted: false
};

function renderMenu(props: {
  token: typeof token | null;
  onClose: () => void;
  onToggleWatchlist: () => void;
}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TokenContextMenu
        {...props}
        anchorPosition={{ top: 100, left: 100 }}
        onContextMenuOverlay={vi.fn()}
      />
    </MemoryRouter>
  );
}

describe('TokenContextMenu', () => {
  it('only opens with a token and anchor and invokes watchlist actions', async () => {
    const onClose = vi.fn();
    const onToggleWatchlist = vi.fn();
    const { rerender } = renderMenu({ token: null, onClose, onToggleWatchlist });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={token}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={onClose}
          onToggleWatchlist={onToggleWatchlist}
          onContextMenuOverlay={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Add to watchlist' }));

    expect(onToggleWatchlist).toHaveBeenCalledOnce();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('hides the chart action and provides safe external research links', async () => {
    const { rerender } = renderMenu({ token: null, onClose: vi.fn(), onToggleWatchlist: vi.fn() });
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={token}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          onToggleWatchlist={vi.fn()}
          onContextMenuOverlay={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('menuitem', { name: 'Open chart' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Binance Futures' })).toHaveAttribute(
      'href',
      'https://www.binance.com/en/futures/ALPHA%2FUSDT'
    );
    expect(screen.getByRole('menuitem', { name: 'CoinGlass' })).toHaveAttribute(
      'href',
      'https://www.coinglass.com/tv/Binance_ALPHA%2FUSDT'
    );
    for (const label of ['Binance Futures', 'CoinGlass', 'CoinMarketCap']) {
      expect(screen.getByRole('menuitem', { name: label })).toHaveAttribute(
        'rel',
        'noopener noreferrer'
      );
    }
  });
});
