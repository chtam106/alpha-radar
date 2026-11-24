import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WatchlistFeedback } from './index';

describe('WatchlistFeedback', () => {
  it('shows an animated confirmation and closes it automatically', () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      const { rerender } = render(<WatchlistFeedback feedback="added" onClose={onClose} />);
      const dialog = screen.getByRole('dialog', { name: 'Added to watchlist' });
      expect(dialog).toBeVisible();
      expect(dialog.textContent).toBe('');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(dialog).toBeVisible();

      act(() => vi.advanceTimersByTime(599));
      expect(onClose).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(onClose).toHaveBeenCalledOnce();
      rerender(<WatchlistFeedback feedback={null} onClose={onClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an error instead of a success confirmation when saving fails', () => {
    render(<WatchlistFeedback feedback="error" onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save the watchlist');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('labels bulk-clear confirmations for the relevant list', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <WatchlistFeedback feedback="cleared" onClose={onClose} context="watchlist" />
    );
    expect(screen.getByRole('dialog', { name: 'Watchlist cleared' })).toBeVisible();

    rerender(<WatchlistFeedback feedback="cleared" onClose={onClose} context="home" />);
    expect(screen.getByRole('dialog', { name: 'All coins restored to Home' })).toBeVisible();
  });
});
