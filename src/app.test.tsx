import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rootRenderMock = vi.hoisted(() => vi.fn());

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: rootRenderMock }))
}));
vi.mock('@/pages/home', () => ({ HomePage: () => <div>home page test content</div> }));
vi.mock('@/pages/chart', () => ({ CoinChartPage: () => <div>chart page test content</div> }));
vi.mock('@/pages/watchlist', () => ({
  WatchlistPage: () => <div>watchlist page test content</div>
}));

import { AppRoutes } from './app';

function CurrentPath() {
  const { pathname } = useLocation();
  return <output>{pathname}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <CurrentPath />
    </MemoryRouter>
  );
}

describe('application routes', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('renders Home at the root and updates the document title', async () => {
    renderAt('/');

    expect(await screen.findByText('home page test content')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Alpha Radar | Binance'));
  });

  it.each(['/alpha-radar', '/alpha-bsc', '/unknown-route'])(
    'redirects the legacy or unknown route %s to Home',
    async (path) => {
      renderAt(path);

      expect(await screen.findByText('home page test content')).toBeInTheDocument();
      expect(await screen.findByText('/')).toBeInTheDocument();
    }
  );

  it('loads Watchlist through the header navigation', async () => {
    renderAt('/');

    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }));

    expect(await screen.findByText('watchlist page test content')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Watchlist | Alpha Radar'));
  });

  it('loads a chart route and applies its symbol title', async () => {
    renderAt('/chart/alphausdt');

    expect(await screen.findByText('chart page test content')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('ALPHAUSDT | Binance Futures'));
  });
});
