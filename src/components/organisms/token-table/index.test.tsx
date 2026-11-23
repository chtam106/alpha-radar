import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TokenTable, type TokenTableRowData } from './index';

const row: TokenTableRowData = {
  id: 'alpha',
  futuresSymbol: 'ALPHAUSDT',
  symbol: 'ALPHA',
  name: 'Alpha Token',
  iconUrl: null,
  price: null,
  marketCap: null,
  fdv: null,
  totalSupply: null,
  unlockedPercent: null,
  circulatingSupply: null
};

describe('TokenTable', () => {
  it('renders missing values and forwards sort changes', () => {
    const onSortChange = vi.fn();
    render(
      <TokenTable
        rows={[row]}
        ariaLabel="Test token table"
        sort={{ field: 'marketCap', direction: 'asc', onChange: onSortChange }}
        onOpenMenu={vi.fn()}
      />
    );

    expect(screen.getByRole('table', { name: 'Test token table' })).toBeInTheDocument();
    expect(screen.getByText('Alpha Token')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6);

    fireEvent.click(screen.getByRole('button', { name: 'FDV' }));
    expect(onSortChange).toHaveBeenCalledWith('fdv');
  });

  it('opens the context menu from a right-click or keyboard activation', () => {
    const onOpenMenu = vi.fn();
    render(<TokenTable rows={[row]} ariaLabel="Test token table" onOpenMenu={onOpenMenu} />);
    const tokenRow = screen.getByRole('row', { name: 'Open ALPHAUSDT actions menu' });

    fireEvent.contextMenu(tokenRow, { clientX: 120, clientY: 180 });
    expect(onOpenMenu).toHaveBeenLastCalledWith('ALPHAUSDT', 120, 180);

    vi.spyOn(tokenRow, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      bottom: 40
    } as DOMRect);
    fireEvent.keyDown(tokenRow, { key: 'Enter' });
    expect(onOpenMenu).toHaveBeenLastCalledWith('ALPHAUSDT', 10, 40);
  });
});
