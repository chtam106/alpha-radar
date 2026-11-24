import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rootRenderMock = vi.hoisted(() => vi.fn());

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: rootRenderMock }))
}));
vi.mock('@/config/feature-flags', () => ({ ENABLE_CHART_PAGE: true }));
vi.mock('@/pages/home', () => ({ HomePage: () => <div>home page test content</div> }));
vi.mock('@/pages/chart', () => ({ CoinChartPage: () => <div>chart page test content</div> }));
vi.mock('@/pages/watchlist', () => ({
  WatchlistPage: () => <div>watchlist page test content</div>
}));
vi.mock('@/pages/hidden', () => ({
  HiddenCoinsPage: () => <div>hidden coins page test content</div>
}));

import { AppRoutes } from './app';

describe('application routes with the chart flag enabled', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('renders the chart route and restores its symbol-specific title', async () => {
    render(
      <MemoryRouter initialEntries={['/chart/alphausdt']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('chart page test content')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('ALPHAUSDT | Binance Futures'));
  });
});
