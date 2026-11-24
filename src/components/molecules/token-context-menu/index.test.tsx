import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TokenContextMenu, type TokenContextMenuItem } from './index';

const token: TokenContextMenuItem = {
  symbol: 'ALPHA',
  iconUrl: null,
  futuresSymbol: 'ALPHA/USDT',
  coinMarketCapUrl: 'https://coinmarketcap.com/currencies/alpha-token/',
  isWatchlisted: false,
  isHidden: false
};

function renderMenu(props: {
  token: typeof token | null;
  onClose: () => void;
  onToggleWatchlist: () => void;
  onToggleHidden: () => void;
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
  it('shows the token icon or its symbol initial when no icon is available', () => {
    const { container, rerender } = renderMenu({
      token,
      onClose: vi.fn(),
      onToggleWatchlist: vi.fn(),
      onToggleHidden: vi.fn()
    });
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(
      container.ownerDocument.querySelector('.m-token-context-menu__token-icon')
    ).toHaveTextContent('A');

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={{ ...token, iconUrl: 'https://example.com/alpha.png' }}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          onToggleWatchlist={vi.fn()}
          onToggleHidden={vi.fn()}
          onContextMenuOverlay={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(
      container.ownerDocument.querySelector('.m-token-context-menu__token-icon img')
    ).toHaveAttribute('src', 'https://example.com/alpha.png');
  });

  it('only opens with a token and anchor and invokes watchlist actions', async () => {
    const onClose = vi.fn();
    const onToggleWatchlist = vi.fn();
    const onToggleHidden = vi.fn();
    const { rerender } = renderMenu({ token: null, onClose, onToggleWatchlist, onToggleHidden });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={token}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={onClose}
          onToggleWatchlist={onToggleWatchlist}
          onToggleHidden={onToggleHidden}
          onContextMenuOverlay={vi.fn()}
        />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Add to watchlist' }));

    expect(onToggleWatchlist).toHaveBeenCalledOnce();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('invokes the hide action and changes its label for hidden coins', async () => {
    const onToggleHidden = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderMenu({
      token,
      onClose,
      onToggleWatchlist: vi.fn(),
      onToggleHidden
    });

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide from home' }));
    expect(onToggleHidden).toHaveBeenCalledOnce();
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={{ ...token, isHidden: true }}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          onToggleWatchlist={vi.fn()}
          onToggleHidden={vi.fn()}
          onContextMenuOverlay={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(await screen.findByRole('menuitem', { name: 'Show on home' })).toBeInTheDocument();
  });

  it('hides the chart action and provides safe external research links', async () => {
    const { rerender } = renderMenu({
      token: null,
      onClose: vi.fn(),
      onToggleWatchlist: vi.fn(),
      onToggleHidden: vi.fn()
    });
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={token}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          onToggleWatchlist={vi.fn()}
          onToggleHidden={vi.fn()}
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
