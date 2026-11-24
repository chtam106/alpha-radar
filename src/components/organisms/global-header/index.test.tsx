import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GlobalHeader } from './index';

function CurrentPath() {
  const { pathname } = useLocation();
  return <output>{pathname}</output>;
}

describe('GlobalHeader', () => {
  it('uses the brand link for Home and marks the active Watchlist route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalHeader />
        <CurrentPath />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Alpha Radar' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).not.toHaveAttribute('aria-current');

    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }));
    expect(screen.getByText('/watchlist')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('link', { name: 'Alpha Radar' }));
    expect(screen.getByText('/')).toBeInTheDocument();
  });
});
