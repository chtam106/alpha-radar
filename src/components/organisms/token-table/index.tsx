import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography
} from '@mui/material';

const TARGET_FDV = 27_500_000_000;

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2
});

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 6
});

const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

const supplyFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});

export type TokenTableSortField = 'marketCap' | 'fdv' | 'unlockedPercent';
export type TokenTableSortDirection = 'asc' | 'desc';

export interface TokenTableRowData {
  id: string;
  futuresSymbol: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  price: number | null;
  marketCap: number | null;
  fdv: number | null;
  totalSupply: number | null;
  unlockedPercent: number | null;
  circulatingSupply: number | null;
}

interface TokenTableSort {
  field: TokenTableSortField;
  direction: TokenTableSortDirection;
  onChange: (field: TokenTableSortField) => void;
}

interface TokenTableProps {
  rows: TokenTableRowData[];
  ariaLabel: string;
  sort?: TokenTableSort;
  onOpenMenu: (futuresSymbol: string, mouseX: number, mouseY: number) => void;
}

function formatUsd(value: number | null): string {
  return value === null ? '—' : usdFormatter.format(value);
}

function formatPrice(value: number | null): string {
  return value === null ? '—' : priceFormatter.format(value);
}

function formatSupply(value: number | null): string {
  return value === null ? '—' : supplyFormatter.format(value);
}

export function TokenTable({ rows, ariaLabel, sort, onOpenMenu }: TokenTableProps) {
  return (
    <TableContainer className="m-token-table__wrap">
      <Table aria-label={ariaLabel} className="m-token-table__table">
        <colgroup>
          <col className="m-token-table__index-col" />
          <col span={6} />
          <col className="m-token-table__target-fdv-col" />
          <col className="m-token-table__target-fdv-col" />
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell align="center" rowSpan={2} className="m-token-table__index-cell">
              #
            </TableCell>
            <TableCell rowSpan={2}>Coin</TableCell>
            <TableCell align="center" rowSpan={2}>
              Price
            </TableCell>
            <TableCell
              align="center"
              rowSpan={2}
              sortDirection={sort?.field === 'marketCap' ? sort.direction : false}
            >
              {sort ? (
                <TableSortLabel
                  active={sort.field === 'marketCap'}
                  direction={sort.field === 'marketCap' ? sort.direction : 'desc'}
                  onClick={() => sort.onChange('marketCap')}
                >
                  Market cap
                </TableSortLabel>
              ) : (
                'Market cap'
              )}
            </TableCell>
            <TableCell
              align="center"
              rowSpan={2}
              sortDirection={sort?.field === 'fdv' ? sort.direction : false}
            >
              {sort ? (
                <TableSortLabel
                  active={sort.field === 'fdv'}
                  direction={sort.field === 'fdv' ? sort.direction : 'desc'}
                  onClick={() => sort.onChange('fdv')}
                >
                  FDV
                </TableSortLabel>
              ) : (
                'FDV'
              )}
            </TableCell>
            <TableCell align="center" rowSpan={2}>
              Total Supply
            </TableCell>
            <TableCell
              align="center"
              rowSpan={2}
              sortDirection={sort?.field === 'unlockedPercent' ? sort.direction : false}
            >
              {sort ? (
                <TableSortLabel
                  active={sort.field === 'unlockedPercent'}
                  direction={sort.field === 'unlockedPercent' ? sort.direction : 'asc'}
                  onClick={() => sort.onChange('unlockedPercent')}
                >
                  Unlocked
                </TableSortLabel>
              ) : (
                'Unlocked'
              )}
            </TableCell>
            <TableCell align="center" colSpan={2}>
              @ $27.5B FDV
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="center" className="m-token-table__target-fdv-cell">
              Price
            </TableCell>
            <TableCell align="center" className="m-token-table__target-fdv-cell">
              MC
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={row.id}
              hover
              role="row"
              tabIndex={0}
              aria-haspopup="menu"
              aria-label={`Open ${row.futuresSymbol} actions menu`}
              className="m-token-table__row"
              data-futures-symbol={row.futuresSymbol}
              onClick={(event) => onOpenMenu(row.futuresSymbol, event.clientX, event.clientY)}
              onContextMenu={(event) => {
                event.preventDefault();
                onOpenMenu(row.futuresSymbol, event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if (
                  (event.shiftKey && event.key === 'F10') ||
                  event.key === 'ContextMenu' ||
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  onOpenMenu(row.futuresSymbol, bounds.left, bounds.bottom);
                }
              }}
            >
              <TableCell align="center" className="m-token-table__index-cell">
                {index + 1}
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 180 }}>
                  <Box component="span" className="m-token-table__token-icon">
                    {row.iconUrl ? (
                      <img src={row.iconUrl} alt={row.symbol} referrerPolicy="no-referrer" />
                    ) : (
                      row.symbol.slice(0, 1)
                    )}
                  </Box>
                  <Box>
                    <Typography className="m-token-table__token-symbol">{row.symbol}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      className="m-token-table__token-name"
                    >
                      {row.name}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell align="center">{formatPrice(row.price)}</TableCell>
              <TableCell align="center">{formatUsd(row.marketCap)}</TableCell>
              <TableCell align="center">{formatUsd(row.fdv)}</TableCell>
              <TableCell align="center" className="m-token-table__supply-data">
                {formatSupply(row.totalSupply)}
              </TableCell>
              <TableCell align="center">
                {row.unlockedPercent === null
                  ? '—'
                  : `${percentFormatter.format(row.unlockedPercent)}%`}
              </TableCell>
              <TableCell align="center" className="m-token-table__target-fdv-cell">
                {formatPrice(
                  row.totalSupply !== null && row.totalSupply > 0
                    ? TARGET_FDV / row.totalSupply
                    : null
                )}
              </TableCell>
              <TableCell align="center" className="m-token-table__target-fdv-cell">
                {formatUsd(
                  row.totalSupply !== null && row.totalSupply > 0 && row.circulatingSupply !== null
                    ? (TARGET_FDV * row.circulatingSupply) / row.totalSupply
                    : null
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
