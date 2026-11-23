import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TokenTable, TokenTableSortControl, type TokenTableRowData } from './index';

const row: TokenTableRowData = {
  id: 'alpha',
  futuresSymbol: 'ALPHAUSDT',
  symbol: 'ALPHA',
  liquidity: 1234567.89,
  iconUrl: null,
  price: null,
  marketCap: null,
  fdv: null,
  totalSupply: null,
  unlockedPercent: null,
  circulatingSupply: null
};

describe('TokenTable', () => {
  it('renders missing values and token table headers', () => {
    render(<TokenTable rows={[row]} ariaLabel="Test token table" onOpenMenu={vi.fn()} />);

    const table = screen.getByRole('table', { name: 'Test token table' });
    const firstHeaderRow = within(table).getAllByRole('row')[0];
    const chainLiquidityHeader = within(firstHeaderRow).getByRole('columnheader', {
      name: 'Chain.Lq'
    });
    const targetFdvHeader = within(firstHeaderRow).getByRole('columnheader', {
      name: 'If FDV reaches $27.5B'
    });
    expect(
      within(firstHeaderRow).getByRole('columnheader', { name: 'T.Supply' })
    ).toBeInTheDocument();
    const headerOrder = Array.from(firstHeaderRow.querySelectorAll('th')).map((cell) =>
      cell.textContent?.trim()
    );
    expect(headerOrder.indexOf(chainLiquidityHeader.textContent?.trim())).toBeLessThan(
      headerOrder.indexOf(targetFdvHeader.textContent?.trim())
    );
    expect(screen.getByRole('cell', { name: '$1.23M' })).toBeInTheDocument();
    expect(within(table).getByText('ALPHA')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Token')).not.toBeInTheDocument();
    expect(within(table).getAllByText('—').length).toBeGreaterThanOrEqual(6);
  });

  it('renders token details in a mobile card and opens its actions menu', () => {
    const onOpenMenu = vi.fn();
    const populatedRow: TokenTableRowData = {
      ...row,
      liquidity: 1_234_567,
      price: 1.25,
      marketCap: 100_000_000,
      fdv: 200_000_000,
      totalSupply: 10_000_000,
      unlockedPercent: 23.45,
      circulatingSupply: 4_000_000
    };

    render(
      <TokenTable rows={[populatedRow]} ariaLabel="Test token table" onOpenMenu={onOpenMenu} />
    );

    const card = screen.getByRole('button', { name: 'Open ALPHAUSDT actions menu' });
    const metrics = within(card).getByText('Chain.Lq').closest('dl');
    if (!metrics) throw new Error('Card metrics are missing');
    expect(within(metrics).getByText('Price')).toBeInTheDocument();
    expect(within(metrics).getByText('$1.25')).toBeInTheDocument();
    expect(within(metrics).getByText('MC')).toBeInTheDocument();
    expect(within(metrics).getByText('$100M')).toBeInTheDocument();
    expect(within(metrics).getByText('23.45%')).toBeInTheDocument();
    expect(within(metrics).getByText('Total supply')).toBeInTheDocument();
    expect(within(metrics).getByText('10M')).toBeInTheDocument();
    const targetGroup = within(card).getByText('If FDV reaches $27.5B').parentElement;
    if (!targetGroup) throw new Error('Target FDV group is missing');
    expect(within(targetGroup).getByText('Price')).toBeInTheDocument();
    expect(within(targetGroup).getByText('MC')).toBeInTheDocument();
    expect(within(targetGroup).getByText('$2,750')).toBeInTheDocument();
    expect(within(targetGroup).getByText('$11B')).toBeInTheDocument();

    fireEvent.click(card, { clientX: 12, clientY: 24 });
    expect(onOpenMenu).toHaveBeenCalledWith('ALPHAUSDT', 12, 24);
  });

  it('provides sort controls outside the token table', () => {
    const onSortChange = vi.fn();
    render(
      <TokenTableSortControl
        sort={{ field: 'marketCap', direction: 'asc', onChange: onSortChange }}
      />
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Sort by' }));
    fireEvent.click(screen.getByRole('option', { name: 'FDV' }));
    expect(onSortChange).toHaveBeenCalledWith('fdv');

    fireEvent.click(
      screen.getByRole('button', { name: 'Change sort direction (currently ascending)' })
    );
    expect(onSortChange).toHaveBeenLastCalledWith('marketCap');
  });

  it('sorts from desktop table headers', () => {
    const onSortChange = vi.fn();
    render(
      <TokenTable
        rows={[row]}
        ariaLabel="Test token table"
        sort={{ field: 'marketCap', direction: 'asc', onChange: onSortChange }}
        onOpenMenu={vi.fn()}
      />
    );

    const table = screen.getByRole('table', { name: 'Test token table' });
    const headerRow = within(table).getAllByRole('row')[0];
    expect(within(headerRow).getByRole('columnheader', { name: 'MC' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    fireEvent.click(within(table).getByRole('button', { name: 'FDV' }));
    expect(onSortChange).toHaveBeenCalledWith('fdv');
    fireEvent.click(within(table).getByRole('button', { name: 'Unlocked' }));
    expect(onSortChange).toHaveBeenCalledWith('unlockedPercent');
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
