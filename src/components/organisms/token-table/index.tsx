import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useId } from 'react';

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
  liquidity: number | null;
  iconUrl: string | null;
  price: number | null;
  marketCap: number | null;
  fdv: number | null;
  totalSupply: number | null;
  unlockedPercent: number | null;
  circulatingSupply: number | null;
}

export interface TokenTableSort {
  field: TokenTableSortField;
  direction: TokenTableSortDirection;
  onChange: (field: TokenTableSortField) => void;
}

interface TokenTableSortControlProps {
  sort: TokenTableSort;
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

function isTokenTableSortField(value: string): value is TokenTableSortField {
  return value === 'marketCap' || value === 'fdv' || value === 'unlockedPercent';
}

export function TokenTableSortControl({ sort }: TokenTableSortControlProps) {
  const sortLabelId = useId();

  return (
    <Box className="m-token-table__sort-controls">
      <FormControl size="small" className="m-token-table__sort-control">
        <InputLabel id={sortLabelId}>Sort by</InputLabel>
        <Select
          labelId={sortLabelId}
          value={sort.field}
          label="Sort by"
          inputProps={{ 'aria-label': 'Sort tokens by' }}
          onChange={(event) => {
            if (isTokenTableSortField(event.target.value)) {
              sort.onChange(event.target.value);
            }
          }}
        >
          <MenuItem value="marketCap">Market cap</MenuItem>
          <MenuItem value="fdv">FDV</MenuItem>
          <MenuItem value="unlockedPercent">Unlocked</MenuItem>
        </Select>
      </FormControl>
      <IconButton
        size="small"
        aria-label={`Change sort direction (currently ${sort.direction === 'asc' ? 'ascending' : 'descending'})`}
        onClick={() => sort.onChange(sort.field)}
      >
        {sort.direction === 'asc' ? <ArrowUpwardRoundedIcon /> : <ArrowDownwardRoundedIcon />}
      </IconButton>
    </Box>
  );
}

export function TokenTable({ rows, ariaLabel, sort, onOpenMenu }: TokenTableProps) {
  return (
    <Box className="m-token-table">
      <TableContainer className="m-token-table__wrap">
        <Table aria-label={ariaLabel} className="m-token-table__table">
          <colgroup>
            <col className="m-token-table__index-col" />
            <col span={7} />
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
                    MC
                  </TableSortLabel>
                ) : (
                  'MC'
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
                T.Supply
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
              <TableCell align="center" rowSpan={2}>
                Chain.Lq
              </TableCell>
              <TableCell align="center" colSpan={2}>
                If FDV reaches $27.5B
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
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box component="span" className="m-token-table__token-icon">
                      {row.iconUrl ? (
                        <img src={row.iconUrl} alt={row.symbol} referrerPolicy="no-referrer" />
                      ) : (
                        row.symbol.slice(0, 1)
                      )}
                    </Box>
                    <Typography className="m-token-table__token-symbol">{row.symbol}</Typography>
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
                <TableCell align="center" className="m-token-table__chain-liquidity">
                  {formatUsd(row.liquidity)}
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
                    row.totalSupply !== null &&
                      row.totalSupply > 0 &&
                      row.circulatingSupply !== null
                      ? (TARGET_FDV * row.circulatingSupply) / row.totalSupply
                      : null
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box component="ul" aria-label={`${ariaLabel} cards`} className="m-token-table__cards">
        {rows.map((row, index) => (
          <Box component="li" key={row.id} className="m-token-table__card-item">
            <Box
              component="button"
              type="button"
              aria-haspopup="menu"
              aria-label={`Open ${row.futuresSymbol} actions menu`}
              className="m-token-table__card"
              data-futures-symbol={row.futuresSymbol}
              onClick={(event) => onOpenMenu(row.futuresSymbol, event.clientX, event.clientY)}
              onContextMenu={(event) => {
                event.preventDefault();
                onOpenMenu(row.futuresSymbol, event.clientX, event.clientY);
              }}
              onKeyDown={(event) => {
                if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
                  event.preventDefault();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  onOpenMenu(row.futuresSymbol, bounds.left, bounds.bottom);
                }
              }}
            >
              <Box className="m-token-table__card-heading">
                <Box className="m-token-table__card-identity">
                  <Typography component="span" className="m-token-table__card-index">
                    #{index + 1}
                  </Typography>
                  <Box component="span" className="m-token-table__token-icon">
                    {row.iconUrl ? (
                      <img src={row.iconUrl} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      row.symbol.slice(0, 1)
                    )}
                  </Box>
                  <Typography component="span" className="m-token-table__token-symbol">
                    {row.symbol}
                  </Typography>
                </Box>
              </Box>
              <Box component="dl" className="m-token-table__metrics">
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    Price
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {formatPrice(row.price)}
                  </Typography>
                </Box>
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    MC
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {formatUsd(row.marketCap)}
                  </Typography>
                </Box>
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    FDV
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {formatUsd(row.fdv)}
                  </Typography>
                </Box>
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    Total supply
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {formatSupply(row.totalSupply)}
                  </Typography>
                </Box>
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    Unlocked
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {row.unlockedPercent === null
                      ? '—'
                      : `${percentFormatter.format(row.unlockedPercent)}%`}
                  </Typography>
                </Box>
                <Box className="m-token-table__metric">
                  <Typography component="dt" className="m-token-table__card-label">
                    Chain.Lq
                  </Typography>
                  <Typography component="dd" className="m-token-table__card-value">
                    {formatUsd(row.liquidity)}
                  </Typography>
                </Box>
              </Box>
              <Box className="m-token-table__target">
                <Typography component="span" className="m-token-table__card-label">
                  If FDV reaches $27.5B
                </Typography>
                <Box component="dl" className="m-token-table__detail-list">
                  <Box className="m-token-table__detail">
                    <Typography component="dt" className="m-token-table__card-label">
                      Price
                    </Typography>
                    <Typography component="dd" className="m-token-table__card-value">
                      {formatPrice(
                        row.totalSupply !== null && row.totalSupply > 0
                          ? TARGET_FDV / row.totalSupply
                          : null
                      )}
                    </Typography>
                  </Box>
                  <Box className="m-token-table__detail">
                    <Typography component="dt" className="m-token-table__card-label">
                      MC
                    </Typography>
                    <Typography component="dd" className="m-token-table__card-value">
                      {formatUsd(
                        row.totalSupply !== null &&
                          row.totalSupply > 0 &&
                          row.circulatingSupply !== null
                          ? (TARGET_FDV * row.circulatingSupply) / row.totalSupply
                          : null
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
