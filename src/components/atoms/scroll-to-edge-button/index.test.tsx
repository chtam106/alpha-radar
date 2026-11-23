import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollToEdgeButton } from './index';

describe('ScrollToEdgeButton', () => {
  const scrollToMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('scrollTo', scrollToMock);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000
    });
    Object.defineProperty(document.body, 'scrollHeight', { configurable: true, value: 900 });
  });

  it('scrolls to the opposite edge and switches direction at the bottom', () => {
    render(<ScrollToEdgeButton />);

    const scrollDownButton = screen.getByRole('button', { name: 'Scroll to bottom' });
    expect(scrollDownButton.querySelector('svg')).toHaveClass(
      'a-scroll-to-edge-button__icon--down'
    );
    fireEvent.click(scrollDownButton);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    fireEvent.scroll(window);
    const scrollUpButton = screen.getByRole('button', { name: 'Scroll to top' });
    expect(scrollUpButton.querySelector('svg')).toHaveClass('a-scroll-to-edge-button__icon--up');
    fireEvent.click(scrollUpButton);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' });
  });
});
