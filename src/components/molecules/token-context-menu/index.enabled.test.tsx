import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/feature-flags', () => ({ ENABLE_CHART_PAGE: true }));

import { TokenContextMenu } from './index';

function CurrentPath() {
  const { pathname } = useLocation();
  return <output>{pathname}</output>;
}

describe('TokenContextMenu with the chart flag enabled', () => {
  it('restores the chart action and navigates to the token chart', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TokenContextMenu
          token={{
            name: 'Alpha Token',
            futuresSymbol: 'ALPHA/USDT',
            coinMarketCapUrl: 'https://coinmarketcap.com/currencies/alpha-token/',
            isWatchlisted: false
          }}
          anchorPosition={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          onToggleWatchlist={vi.fn()}
          onContextMenuOverlay={vi.fn()}
        />
        <CurrentPath />
      </MemoryRouter>
    );

    const chartAction = screen.getByRole('menuitem', { name: 'Open chart' });
    expect(chartAction).toHaveAttribute('href', '/chart/ALPHA%2FUSDT');

    fireEvent.click(chartAction);
    expect(screen.getByText('/chart/ALPHA%2FUSDT')).toBeInTheDocument();
  });
});
