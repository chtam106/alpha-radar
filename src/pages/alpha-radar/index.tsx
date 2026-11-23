import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
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
import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react';
import { useWatchlist } from '@/hooks/use-watchlist';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';
import { getCoinMarketCapUrl } from '@/services/coinmarketcap';
import { TokenContextMenu } from '@/components/molecules/token-context-menu';

type SortField = 'marketCap' | 'fdv' | 'unlockedPercent';
type SortDirection = 'asc' | 'desc';
type SortPreference = { field: SortField; direction: SortDirection };

const SORT_PREFERENCE_STORAGE_KEY = 'crypto-dashboard:sort-preference';
const DEFAULT_SORT_PREFERENCE: SortPreference = { field: 'marketCap', direction: 'asc' };
const TARGET_FDV = 27_500_000_000;
const TOTAL_SUPPLY_FILTERS = [
  { label: '1B', value: 1_000_000_000 },
  { label: '10B', value: 10_000_000_000 }
] as const;
type TotalSupplyFilter = (typeof TOTAL_SUPPLY_FILTERS)[number]['value'];
const UNLOCK_FILTERS = [35, 30, 25, 20] as const;
type UnlockFilter = (typeof UNLOCK_FILTERS)[number];
const DEFAULT_UNLOCK_FILTER: UnlockFilter = 35;

type TokenContextMenuState = { token: BscAlphaToken; mouseX: number; mouseY: number };

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
});

const supplyFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});

function isSortField(value: string | undefined): value is SortField {
  return value === 'marketCap' || value === 'fdv' || value === 'unlockedPercent';
}

function isSortDirection(value: string | undefined): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function readSortPreference(): SortPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_SORT_PREFERENCE;
  }

  const savedPreference = window.localStorage.getItem(SORT_PREFERENCE_STORAGE_KEY);
  if (!savedPreference) {
    return DEFAULT_SORT_PREFERENCE;
  }

  const [field, direction, ...extra] = savedPreference.split(':');
  if (extra.length === 0 && isSortField(field) && isSortDirection(direction)) {
    return { field, direction };
  }

  return DEFAULT_SORT_PREFERENCE;
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 6
});

function formatUsd(value: number | null): string {
  return value === null ? '—' : usdFormatter.format(value);
}

function formatPrice(value: number | null): string {
  return value === null ? '—' : priceFormatter.format(value);
}

function formatSupply(value: number): string {
  return supplyFormatter.format(value);
}

export function CryptoDashboard() {
  const [tokens, setTokens] = useState<BscAlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortPreference, setSortPreference] = useState(readSortPreference);
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const [contextMenu, setContextMenu] = useState<TokenContextMenuState | null>(null);
  const [totalSupplyFilters, setTotalSupplyFilters] = useState<TotalSupplyFilter[]>([]);
  const [unlockFilter, setUnlockFilter] = useState<UnlockFilter>(DEFAULT_UNLOCK_FILTER);
  const filtersActive = totalSupplyFilters.length > 0 || unlockFilter !== DEFAULT_UNLOCK_FILTER;
  const { field: sortField, direction: sortDirection } = sortPreference;
  useEffect(() => {
    const controller = new AbortController();

    async function loadTokens() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchBscAlphaTokens(controller.signal);
        setTokens(result);
        setLastUpdated(new Date());
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unable to load Binance Alpha tokens.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTokens();
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    window.localStorage.setItem(
      SORT_PREFERENCE_STORAGE_KEY,
      `${sortPreference.field}:${sortPreference.direction}`
    );
  }, [sortPreference]);

  const filteredTokens = useMemo(
    () =>
      tokens.filter(
        (token) =>
          token.unlockedPercent <= unlockFilter &&
          (totalSupplyFilters.length === 0 ||
            totalSupplyFilters.some((supply) => token.totalSupply === supply))
      ),
    [tokens, totalSupplyFilters, unlockFilter]
  );

  const sortedTokens = useMemo(
    () =>
      [...filteredTokens].sort((first, second) => {
        const firstValue = first[sortField];
        const secondValue = second[sortField];
        if (firstValue === null) {
          return secondValue === null ? 0 : 1;
        }
        if (secondValue === null) {
          return -1;
        }
        return sortDirection === 'asc' ? firstValue - secondValue : secondValue - firstValue;
      }),
    [filteredTokens, sortDirection, sortField]
  );

  function toggleTotalSupplyFilter(supply: TotalSupplyFilter) {
    setTotalSupplyFilters((current) =>
      current.includes(supply) ? current.filter((value) => value !== supply) : [...current, supply]
    );
  }

  function openTokenMenu(token: BscAlphaToken, mouseX: number, mouseY: number) {
    setContextMenu({ token, mouseX, mouseY });
  }

  function handleContextMenuOnOverlay(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const paper = document.querySelector<HTMLElement>('.m-token-context-menu__paper');
    const backdrop = document.querySelector<HTMLElement>('.m-token-context-menu__backdrop');
    const paperPointerEvents = paper?.style.pointerEvents;
    const backdropPointerEvents = backdrop?.style.pointerEvents;
    const row = (() => {
      try {
        if (paper) {
          paper.style.pointerEvents = 'none';
        }
        if (backdrop) {
          backdrop.style.pointerEvents = 'none';
        }
        return (
          document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('[data-futures-symbol]') ?? null
        );
      } finally {
        if (paper) {
          paper.style.pointerEvents = paperPointerEvents ?? '';
        }
        if (backdrop) {
          backdrop.style.pointerEvents = backdropPointerEvents ?? '';
        }
      }
    })();

    const symbol = row?.dataset.futuresSymbol;
    const token = sortedTokens.find((candidate) => candidate.futuresSymbol === symbol);
    if (token && token.futuresSymbol !== contextMenu?.token.futuresSymbol) {
      setContextMenu({ token, mouseX: event.clientX, mouseY: event.clientY });
    } else if (!token) {
      setContextMenu(null);
    }
  }

  function handleSort(field: SortField) {
    setSortPreference((current) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'unlockedPercent' ? 'asc' : 'desc' }
    );
  }

  return (
    <Container maxWidth="lg" className="p-crypto-dashboard">
      <Box component="main" className="p-crypto-dashboard__main">
        <Stack spacing={3}>
          <Box className="p-crypto-dashboard__intro">
            <Box className="p-crypto-dashboard__intro-copy">
              <Typography variant="h1" sx={{ mt: 0.5, fontSize: { xs: 34, sm: 46 } }}>
                High-Risk Alpha Radar
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
                className="p-crypto-dashboard__description"
              >
                Binance Alpha on BSC · Futures only, no Spot, ≤35% circulating supply. Speculative
                research; scams and rug pulls are possible.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="p-crypto-dashboard__refresh"
            >
              Refresh
            </Button>
          </Box>

          <Box className="p-crypto-dashboard__list-heading">
            <Box className="p-crypto-dashboard__filters">
              <Box
                role="group"
                aria-label="Filter by total supply"
                className="p-crypto-dashboard__quick-filter"
              >
                <Typography className="p-crypto-dashboard__quick-filter-label">
                  Total supply
                </Typography>
                <Box className="p-crypto-dashboard__quick-filter-options">
                  <Chip
                    label="All"
                    clickable
                    aria-pressed={totalSupplyFilters.length === 0}
                    variant={totalSupplyFilters.length === 0 ? 'filled' : 'outlined'}
                    color={totalSupplyFilters.length === 0 ? 'primary' : 'default'}
                    onClick={() => setTotalSupplyFilters([])}
                    className="p-crypto-dashboard__quick-filter-chip"
                  />
                  {TOTAL_SUPPLY_FILTERS.map(({ label, value }) => {
                    const selected = totalSupplyFilters.includes(value);
                    return (
                      <Chip
                        key={value}
                        label={label}
                        clickable
                        aria-pressed={selected}
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'primary' : 'default'}
                        onClick={() => toggleTotalSupplyFilter(value)}
                        className="p-crypto-dashboard__quick-filter-chip"
                      />
                    );
                  })}
                </Box>
              </Box>
              <Box
                role="group"
                aria-label="Filter by maximum unlock"
                className="p-crypto-dashboard__quick-filter"
              >
                <Typography className="p-crypto-dashboard__quick-filter-label">
                  Max unlock
                </Typography>
                <Box className="p-crypto-dashboard__quick-filter-options">
                  {UNLOCK_FILTERS.map((value) => {
                    const selected = unlockFilter === value;
                    return (
                      <Chip
                        key={value}
                        label={`${value}%`}
                        clickable
                        aria-pressed={selected}
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'primary' : 'default'}
                        onClick={() => setUnlockFilter(value)}
                        className="p-crypto-dashboard__quick-filter-chip"
                      />
                    );
                  })}
                </Box>
              </Box>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {tokens.length > 0 && (
                <Typography variant="body2" className="p-crypto-dashboard__list-meta">
                  {filtersActive
                    ? `${sortedTokens.length} of ${tokens.length} coins match`
                    : `${tokens.length} coins match`}
                </Typography>
              )}
              {lastUpdated && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="p-crypto-dashboard__list-meta"
                >
                  Updated{' '}
                  {lastUpdated.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              )}
              {error && tokens.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Count unavailable
                </Typography>
              )}
              {loading && tokens.length > 0 && (
                <CircularProgress size={20} aria-label="Refreshing token list" />
              )}
            </Stack>
          </Box>

          <Box className="p-crypto-dashboard__list-panel">
            {error && (
              <Alert
                severity={tokens.length > 0 ? 'warning' : 'error'}
                className="p-crypto-dashboard__alert"
              >
                {error}
              </Alert>
            )}

            {loading && tokens.length === 0 ? (
              <Box className="p-crypto-dashboard__state">
                <CircularProgress size={28} />
                <Typography color="text.secondary">Loading Binance Alpha tokens…</Typography>
              </Box>
            ) : sortedTokens.length > 0 ? (
              <TableContainer className="p-crypto-dashboard__table-wrap">
                <Table
                  aria-label="Binance Alpha BSC tokens listed in futures but not spot, with unlock of 35 percent or less"
                  className="p-crypto-dashboard__table"
                >
                  <colgroup>
                    <col className="p-crypto-dashboard__index-col" />
                    <col span={6} />
                    <col className="p-crypto-dashboard__target-fdv-col" />
                    <col className="p-crypto-dashboard__target-fdv-col" />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        align="center"
                        rowSpan={2}
                        className="p-crypto-dashboard__index-cell"
                      >
                        #
                      </TableCell>
                      <TableCell rowSpan={2}>Coin</TableCell>
                      <TableCell align="center" rowSpan={2}>
                        Price
                      </TableCell>
                      <TableCell
                        align="center"
                        rowSpan={2}
                        sortDirection={sortField === 'marketCap' ? sortDirection : false}
                      >
                        <TableSortLabel
                          active={sortField === 'marketCap'}
                          direction={sortField === 'marketCap' ? sortDirection : 'desc'}
                          onClick={() => handleSort('marketCap')}
                        >
                          Market cap
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="center"
                        rowSpan={2}
                        sortDirection={sortField === 'fdv' ? sortDirection : false}
                      >
                        <TableSortLabel
                          active={sortField === 'fdv'}
                          direction={sortField === 'fdv' ? sortDirection : 'desc'}
                          onClick={() => handleSort('fdv')}
                        >
                          FDV
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center" rowSpan={2}>
                        Total Supply
                      </TableCell>
                      <TableCell
                        align="center"
                        rowSpan={2}
                        sortDirection={sortField === 'unlockedPercent' ? sortDirection : false}
                      >
                        <TableSortLabel
                          active={sortField === 'unlockedPercent'}
                          direction={sortField === 'unlockedPercent' ? sortDirection : 'asc'}
                          onClick={() => handleSort('unlockedPercent')}
                        >
                          Unlocked
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center" colSpan={2}>
                        @ $27.5B FDV
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                        Price
                      </TableCell>
                      <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                        MC
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTokens.map((token, index) => (
                      <TableRow
                        key={token.tokenId}
                        hover
                        role="row"
                        tabIndex={0}
                        aria-haspopup="menu"
                        aria-label={`Open ${token.futuresSymbol} actions menu`}
                        className="p-crypto-dashboard__token-row"
                        data-futures-symbol={token.futuresSymbol}
                        onClick={(event) => openTokenMenu(token, event.clientX, event.clientY)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openTokenMenu(token, event.clientX, event.clientY);
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.shiftKey && event.key === 'F10') ||
                            event.key === 'ContextMenu'
                          ) {
                            event.preventDefault();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            openTokenMenu(token, bounds.left, bounds.bottom);
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            openTokenMenu(token, bounds.left, bounds.bottom);
                          }
                        }}
                      >
                        <TableCell align="center" className="p-crypto-dashboard__index-cell">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{ alignItems: 'center', minWidth: 180 }}
                          >
                            <Box component="span" className="p-crypto-dashboard__token-icon">
                              {token.iconUrl ? (
                                <img
                                  src={token.iconUrl}
                                  alt={token.symbol}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                token.symbol.slice(0, 1)
                              )}
                            </Box>
                            <Box>
                              <Typography className="p-crypto-dashboard__token-symbol">
                                {token.symbol}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                className="p-crypto-dashboard__token-name"
                              >
                                {token.name}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">{formatPrice(token.price)}</TableCell>
                        <TableCell align="center">{formatUsd(token.marketCap)}</TableCell>
                        <TableCell align="center">{formatUsd(token.fdv)}</TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__supply-data">
                          {formatSupply(token.totalSupply)}
                        </TableCell>
                        <TableCell align="center">
                          {percentFormatter.format(token.unlockedPercent)}%
                        </TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                          {formatPrice(
                            token.totalSupply > 0 ? TARGET_FDV / token.totalSupply : null
                          )}
                        </TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                          {formatUsd(
                            token.totalSupply > 0
                              ? (TARGET_FDV * token.circulatingSupply) / token.totalSupply
                              : null
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : tokens.length > 0 ? (
              <Box className="p-crypto-dashboard__state">
                <Typography variant="subtitle1">No matching tokens found</Typography>
                <Typography color="text.secondary">
                  No tokens match the selected filters.
                </Typography>
              </Box>
            ) : error ? null : (
              <Box className="p-crypto-dashboard__state">
                <Typography variant="subtitle1">No matching tokens found</Typography>
                <Typography color="text.secondary">
                  No active BSC Alpha tokens currently meet the 35% unlock threshold.
                </Typography>
              </Box>
            )}
          </Box>
          <TokenContextMenu
            token={
              contextMenu
                ? {
                    name: contextMenu.token.name,
                    futuresSymbol: contextMenu.token.futuresSymbol,
                    coinMarketCapUrl: getCoinMarketCapUrl(contextMenu.token),
                    isWatchlisted: isWatchlisted(contextMenu.token.futuresSymbol)
                  }
                : null
            }
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null
            }
            openChartInNewTab
            onClose={() => setContextMenu(null)}
            onToggleWatchlist={() => {
              if (contextMenu) {
                toggleWatchlist(contextMenu.token.futuresSymbol);
              }
            }}
            onContextMenuOverlay={handleContextMenuOnOverlay}
          />
        </Stack>
      </Box>
    </Container>
  );
}
