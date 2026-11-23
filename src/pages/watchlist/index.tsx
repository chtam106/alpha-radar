import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenContextMenu } from '@/components/molecules/token-context-menu';
import { useWatchlist } from '@/hooks/use-watchlist';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';
import { getCoinMarketCapUrl } from '@/services/coinmarketcap';

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
const TARGET_FDV = 27_500_000_000;

function formatUsd(value: number | null): string {
  return value === null ? '—' : usdFormatter.format(value);
}

function formatPrice(value: number | null): string {
  return value === null ? '—' : priceFormatter.format(value);
}

function formatSupply(value: number): string {
  return supplyFormatter.format(value);
}

function getWatchedTokenCoinMarketCapUrl(
  futuresSymbol: string,
  token: BscAlphaToken | null | undefined
): string {
  return getCoinMarketCapUrl({
    cmcSlug: token?.cmcSlug ?? null,
    contractAddress: token?.contractAddress ?? null,
    name: token?.name ?? null,
    symbol: futuresSymbol.replace(/(?:USDT|USDC)$/, '')
  });
}

export function WatchlistPage() {
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist } = useWatchlist();
  const [contextMenu, setContextMenu] = useState<{
    symbol: string;
    tokenName: string;
    coinMarketCapUrl: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [tokens, setTokens] = useState<BscAlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTokens() {
      setLoading(true);
      setError(null);

      try {
        setTokens(await fetchBscAlphaTokens(controller.signal));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unable to load watchlist token data.'
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

  const tokensBySymbol = useMemo(
    () => new Map(tokens.map((token) => [token.futuresSymbol.toUpperCase(), token])),
    [tokens]
  );
  const watchedTokens = useMemo(
    () => watchlist.map((symbol) => ({ symbol, token: tokensBySymbol.get(symbol) ?? null })),
    [tokensBySymbol, watchlist]
  );

  function openTokenMenu(
    symbol: string,
    token: BscAlphaToken | null,
    mouseX: number,
    mouseY: number
  ) {
    setContextMenu({
      symbol,
      tokenName: token?.name ?? symbol.replace(/(?:USDT|USDC)$/, ''),
      coinMarketCapUrl: getWatchedTokenCoinMarketCapUrl(symbol, token),
      mouseX,
      mouseY
    });
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
    const watchedToken = watchedTokens.find((candidate) => candidate.symbol === symbol);
    if (watchedToken && watchedToken.symbol !== contextMenu?.symbol) {
      openTokenMenu(watchedToken.symbol, watchedToken.token, event.clientX, event.clientY);
    } else if (!watchedToken) {
      setContextMenu(null);
    }
  }

  return (
    <Container maxWidth="lg" className="p-watchlist-page">
      <Box component="main" className="p-watchlist-page__main">
        <Stack spacing={3}>
          <Box className="p-watchlist-page__heading">
            <Box>
              <Typography
                variant="h1"
                sx={{ mt: 0.5, fontSize: { xs: 34, sm: 46 } }}
                className="p-watchlist-page__title"
              >
                Watchlist
              </Typography>
              <Typography color="text.secondary">
                Saved futures pairs are shared across tabs in this browser.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="p-watchlist-page__refresh"
            >
              Refresh
            </Button>
          </Box>

          {error && <Alert severity={tokens.length > 0 ? 'warning' : 'error'}>{error}</Alert>}

          {loading && watchedTokens.length > 0 ? (
            <Box className="p-watchlist-page__state">
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading watchlist data…</Typography>
            </Box>
          ) : watchedTokens.length === 0 ? (
            <Box className="p-watchlist-page__empty">
              <Typography variant="h6">Your watchlist is empty</Typography>
              <Typography color="text.secondary">
                Add a coin from its chart page or by right-clicking it in the Alpha Radar.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/alpha-radar')}
                className="p-watchlist-page__browse-button"
              >
                Browse Alpha Radar
              </Button>
            </Box>
          ) : (
            <Box className="p-watchlist-page__list-panel">
              <TableContainer className="p-crypto-dashboard__table-wrap">
                <Table aria-label="Saved futures watchlist" className="p-crypto-dashboard__table">
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
                      <TableCell align="center" rowSpan={2}>
                        Market cap
                      </TableCell>
                      <TableCell align="center" rowSpan={2}>
                        FDV
                      </TableCell>
                      <TableCell align="center" rowSpan={2}>
                        Total Supply
                      </TableCell>
                      <TableCell align="center" rowSpan={2}>
                        Unlocked
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
                    {watchedTokens.map(({ symbol, token }, index) => (
                      <TableRow
                        key={symbol}
                        hover
                        role="row"
                        tabIndex={0}
                        aria-haspopup="menu"
                        aria-label={`Open ${symbol} actions menu`}
                        className="p-crypto-dashboard__token-row"
                        data-futures-symbol={symbol}
                        onClick={(event) =>
                          openTokenMenu(symbol, token, event.clientX, event.clientY)
                        }
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openTokenMenu(symbol, token, event.clientX, event.clientY);
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.shiftKey && event.key === 'F10') ||
                            event.key === 'ContextMenu'
                          ) {
                            event.preventDefault();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            openTokenMenu(symbol, token, bounds.left, bounds.bottom);
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            openTokenMenu(symbol, token, bounds.left, bounds.bottom);
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
                              {token?.iconUrl ? (
                                <img
                                  src={token.iconUrl}
                                  alt={token.symbol}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                symbol.slice(0, 1)
                              )}
                            </Box>
                            <Box>
                              <Typography className="p-crypto-dashboard__token-symbol">
                                {token?.symbol ?? symbol.replace(/(?:USDT|USDC)$/, '')}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                className="p-crypto-dashboard__token-name"
                              >
                                {token?.name ?? 'Not currently in the Alpha Radar'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">{formatPrice(token?.price ?? null)}</TableCell>
                        <TableCell align="center">{formatUsd(token?.marketCap ?? null)}</TableCell>
                        <TableCell align="center">{formatUsd(token?.fdv ?? null)}</TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__supply-data">
                          {token ? formatSupply(token.totalSupply) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          {token ? `${percentFormatter.format(token.unlockedPercent)}%` : '—'}
                        </TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                          {formatPrice(
                            token && token.totalSupply > 0 ? TARGET_FDV / token.totalSupply : null
                          )}
                        </TableCell>
                        <TableCell align="center" className="p-crypto-dashboard__target-fdv-cell">
                          {formatUsd(
                            token && token.totalSupply > 0
                              ? (TARGET_FDV * token.circulatingSupply) / token.totalSupply
                              : null
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          <TokenContextMenu
            token={
              contextMenu
                ? {
                    name: contextMenu.tokenName,
                    futuresSymbol: contextMenu.symbol,
                    coinMarketCapUrl: contextMenu.coinMarketCapUrl,
                    isWatchlisted: true
                  }
                : null
            }
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null
            }
            onClose={() => setContextMenu(null)}
            onToggleWatchlist={() => {
              if (contextMenu) {
                toggleWatchlist(contextMenu.symbol);
              }
            }}
            onContextMenuOverlay={handleContextMenuOnOverlay}
          />
        </Stack>
      </Box>
    </Container>
  );
}
