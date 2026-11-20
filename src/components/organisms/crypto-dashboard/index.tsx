import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';

type SortField = 'marketCap' | 'fdv' | 'unlockedPercent';
type SortDirection = 'asc' | 'desc';
type SortPreference = { field: SortField; direction: SortDirection };

const SORT_PREFERENCE_STORAGE_KEY = 'crypto-dashboard:sort-preference';
const DEFAULT_SORT_PREFERENCE: SortPreference = { field: 'marketCap', direction: 'asc' };
const TARGET_FDV = 27_500_000_000;

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

function getCoinMarketCapUrl(token: BscAlphaToken): string {
  const slug =
    token.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || token.symbol.toLowerCase();
  return `https://coinmarketcap.com/currencies/${slug}/`;
}

export function CryptoDashboard() {
  const [tokens, setTokens] = useState<BscAlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortPreference, setSortPreference] = useState(readSortPreference);
  const { field: sortField, direction: sortDirection } = sortPreference;
  const navigate = useNavigate();

  function openTokenChart(futuresSymbol: string) {
    const chartPath = `/chart/${encodeURIComponent(futuresSymbol)}`;
    if (window.matchMedia('(min-width: 768px)').matches) {
      window.open(chartPath, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(chartPath);
  }

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

  const sortedTokens = useMemo(
    () =>
      [...tokens].sort((first, second) => {
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
    [sortDirection, sortField, tokens]
  );

  function handleSort(field: SortField) {
    setSortPreference((current) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'unlockedPercent' ? 'asc' : 'desc' }
    );
  }

  return (
    <Container maxWidth="lg" className="o-crypto-dashboard">
      <Box component="main" className="o-crypto-dashboard__main">
        <Stack spacing={3}>
          <Box className="o-crypto-dashboard__intro">
            <Box className="o-crypto-dashboard__intro-copy">
              <Typography variant="h1" sx={{ mt: 0.5, fontSize: { xs: 34, sm: 46 } }}>
                High-Risk Alpha Radar
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
                className="o-crypto-dashboard__description"
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
              className="o-crypto-dashboard__refresh"
            >
              Refresh
            </Button>
          </Box>

          <Box className="o-crypto-dashboard__list-panel">
            <Box className="o-crypto-dashboard__list-heading">
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {tokens.length > 0 && (
                  <Typography variant="body2" className="o-crypto-dashboard__list-meta">
                    {tokens.length} coins match
                  </Typography>
                )}
                {lastUpdated && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="o-crypto-dashboard__list-meta"
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
              </Stack>
              {loading && tokens.length > 0 && (
                <CircularProgress size={20} aria-label="Refreshing token list" />
              )}
            </Box>

            {error && (
              <Alert
                severity={tokens.length > 0 ? 'warning' : 'error'}
                className="o-crypto-dashboard__alert"
              >
                {error}
              </Alert>
            )}

            {loading && tokens.length === 0 ? (
              <Box className="o-crypto-dashboard__state">
                <CircularProgress size={28} />
                <Typography color="text.secondary">Loading Binance Alpha tokens…</Typography>
              </Box>
            ) : tokens.length > 0 ? (
              <TableContainer className="o-crypto-dashboard__table-wrap">
                <Table
                  aria-label="Binance Alpha BSC tokens listed in futures but not spot, with unlock of 35 percent or less"
                  className="o-crypto-dashboard__table"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Coin</TableCell>
                      <TableCell align="center">Price</TableCell>
                      <TableCell
                        align="center"
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
                      <TableCell
                        align="center"
                        sortDirection={sortField === 'unlockedPercent' ? sortDirection : false}
                      >
                        <TableSortLabel
                          active={sortField === 'unlockedPercent'}
                          direction={sortField === 'unlockedPercent' ? sortDirection : 'asc'}
                          onClick={() => handleSort('unlockedPercent')}
                        >
                          Unlock
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">@ $27.5B FDV</TableCell>
                      <TableCell align="center">Links</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTokens.map((token) => (
                      <TableRow
                        key={token.tokenId}
                        hover
                        role="row"
                        tabIndex={0}
                        aria-label={`Open ${token.futuresSymbol} chart; press Enter or Space`}
                        className="o-crypto-dashboard__token-row"
                        onClick={() => openTokenChart(token.futuresSymbol)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openTokenChart(token.futuresSymbol);
                          }
                        }}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{ alignItems: 'center', minWidth: 180 }}
                          >
                            <Box component="span" className="o-crypto-dashboard__token-icon">
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
                              <Typography className="o-crypto-dashboard__token-symbol">
                                {token.symbol}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                className="o-crypto-dashboard__token-name"
                              >
                                {token.name}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">{formatPrice(token.price)}</TableCell>
                        <TableCell align="center">{formatUsd(token.marketCap)}</TableCell>
                        <TableCell align="center">{formatUsd(token.fdv)}</TableCell>
                        <TableCell align="center">
                          <Stack
                            spacing={0.25}
                            sx={{ alignItems: 'center' }}
                            className="o-crypto-dashboard__supply-data"
                          >
                            <Typography variant="body2">
                              {percentFormatter.format(token.unlockedPercent)}%
                            </Typography>
                            <Typography variant="caption">
                              Total supply: {formatSupply(token.totalSupply)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            spacing={0.25}
                            sx={{ alignItems: 'center' }}
                            className="o-crypto-dashboard__target-fdv"
                          >
                            <Typography variant="body2">
                              Price:{' '}
                              {formatPrice(
                                token.totalSupply > 0 ? TARGET_FDV / token.totalSupply : null
                              )}
                            </Typography>
                            <Typography variant="body2">
                              MC: {formatUsd((TARGET_FDV * token.unlockedPercent) / 100)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', justifyContent: 'center' }}
                            className="o-crypto-dashboard__external-links"
                          >
                            <MuiLink
                              href={`https://www.binance.com/en/futures/${encodeURIComponent(token.futuresSymbol)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              color="inherit"
                              underline="none"
                              aria-label="Binance Futures"
                              title="Binance Futures"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Box
                                component="img"
                                src="https://bin.bnbstatic.com/static/images/common/favicon.ico"
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="o-crypto-dashboard__external-link-icon"
                              />
                            </MuiLink>
                            <MuiLink
                              href={`https://www.coinglass.com/tv/Binance_${encodeURIComponent(token.futuresSymbol)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              color="inherit"
                              underline="none"
                              aria-label="CoinGlass"
                              title="CoinGlass"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Box
                                component="img"
                                src="https://cdn.coinglasscdn.com/static/icon_200.png"
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="o-crypto-dashboard__external-link-icon"
                              />
                            </MuiLink>
                            <MuiLink
                              href={getCoinMarketCapUrl(token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              color="inherit"
                              underline="none"
                              aria-label="CoinMarketCap"
                              title="CoinMarketCap"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Box
                                component="img"
                                src="https://coinmarketcap.com/favicon.ico"
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="o-crypto-dashboard__external-link-icon"
                              />
                            </MuiLink>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : error ? null : (
              <Box className="o-crypto-dashboard__state">
                <Typography variant="subtitle1">No matching tokens found</Typography>
                <Typography color="text.secondary">
                  No active BSC Alpha tokens currently meet the 35% unlock threshold.
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Container>
  );
}
