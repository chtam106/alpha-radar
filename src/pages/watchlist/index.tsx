import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Menu,
  MenuItem,
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

  function handleContextMenuOnOverlay(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const paper = document.querySelector<HTMLElement>('.p-crypto-dashboard__context-menu');
    const backdrop = document.querySelector<HTMLElement>(
      '.p-crypto-dashboard__context-menu-backdrop'
    );
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
      setContextMenu({
        symbol: watchedToken.symbol,
        coinMarketCapUrl: getWatchedTokenCoinMarketCapUrl(watchedToken.symbol, watchedToken.token),
        mouseX: event.clientX,
        mouseY: event.clientY
      });
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
                        aria-label={`Open ${symbol} chart; use the context menu to remove from watchlist`}
                        className="p-crypto-dashboard__token-row"
                        data-futures-symbol={symbol}
                        onClick={() => navigate(`/chart/${encodeURIComponent(symbol)}`)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({
                            symbol,
                            coinMarketCapUrl: getWatchedTokenCoinMarketCapUrl(symbol, token),
                            mouseX: event.clientX,
                            mouseY: event.clientY
                          });
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.shiftKey && event.key === 'F10') ||
                            event.key === 'ContextMenu'
                          ) {
                            event.preventDefault();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            setContextMenu({
                              symbol,
                              coinMarketCapUrl: getWatchedTokenCoinMarketCapUrl(symbol, token),
                              mouseX: bounds.left,
                              mouseY: bounds.bottom
                            });
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/chart/${encodeURIComponent(symbol)}`);
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
          <Menu
            open={contextMenu !== null}
            onClose={() => setContextMenu(null)}
            anchorReference="anchorPosition"
            slotProps={{
              paper: {
                className: 'p-crypto-dashboard__context-menu',
                onContextMenu: handleContextMenuOnOverlay
              },
              backdrop: {
                className: 'p-crypto-dashboard__context-menu-backdrop',
                onContextMenu: handleContextMenuOnOverlay
              },
              list: { className: 'p-crypto-dashboard__context-menu-list' }
            }}
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
            }
          >
            {contextMenu && (
              <>
                <Box className="p-crypto-dashboard__context-menu-heading">
                  <Typography className="p-crypto-dashboard__context-menu-label">Token</Typography>
                  <Typography className="p-crypto-dashboard__context-menu-symbol">
                    {contextMenu.symbol}
                  </Typography>
                </Box>
                <MenuItem
                  className="p-crypto-dashboard__context-menu-item"
                  onClick={() => {
                    toggleWatchlist(contextMenu.symbol);
                    setContextMenu(null);
                  }}
                >
                  <Box component="span" className="p-crypto-dashboard__context-menu-icon-wrap">
                    <StarRoundedIcon className="p-crypto-dashboard__context-menu-icon" />
                  </Box>
                  <Typography component="span" className="p-crypto-dashboard__context-menu-action">
                    Remove from watchlist
                  </Typography>
                </MenuItem>
                <Box className="p-crypto-dashboard__context-menu-section">Quick links</Box>
                <MenuItem
                  component="a"
                  href={`https://www.binance.com/en/futures/${encodeURIComponent(contextMenu.symbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-crypto-dashboard__context-menu-item"
                  onClick={() => setContextMenu(null)}
                >
                  <Box
                    component="span"
                    className="p-crypto-dashboard__context-menu-icon-wrap p-crypto-dashboard__context-menu-link-icon-wrap"
                  >
                    <Box
                      component="img"
                      src="https://bin.bnbstatic.com/static/images/common/favicon.ico"
                      alt=""
                      className="p-crypto-dashboard__context-menu-link-logo"
                    />
                  </Box>
                  <Typography component="span" className="p-crypto-dashboard__context-menu-action">
                    Binance Futures
                  </Typography>
                  <OpenInNewRoundedIcon className="p-crypto-dashboard__context-menu-external-icon" />
                </MenuItem>
                <MenuItem
                  component="a"
                  href={`https://www.coinglass.com/tv/Binance_${encodeURIComponent(contextMenu.symbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-crypto-dashboard__context-menu-item"
                  onClick={() => setContextMenu(null)}
                >
                  <Box
                    component="span"
                    className="p-crypto-dashboard__context-menu-icon-wrap p-crypto-dashboard__context-menu-link-icon-wrap"
                  >
                    <Box
                      component="img"
                      src="https://cdn.coinglasscdn.com/static/icon_200.png"
                      alt=""
                      className="p-crypto-dashboard__context-menu-link-logo"
                    />
                  </Box>
                  <Typography component="span" className="p-crypto-dashboard__context-menu-action">
                    CoinGlass
                  </Typography>
                  <OpenInNewRoundedIcon className="p-crypto-dashboard__context-menu-external-icon" />
                </MenuItem>
                <MenuItem
                  component="a"
                  href={contextMenu.coinMarketCapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-crypto-dashboard__context-menu-item"
                  onClick={() => setContextMenu(null)}
                >
                  <Box
                    component="span"
                    className="p-crypto-dashboard__context-menu-icon-wrap p-crypto-dashboard__context-menu-link-icon-wrap"
                  >
                    <Box
                      component="img"
                      src="https://coinmarketcap.com/favicon.ico"
                      alt=""
                      className="p-crypto-dashboard__context-menu-link-logo"
                    />
                  </Box>
                  <Typography component="span" className="p-crypto-dashboard__context-menu-action">
                    CoinMarketCap
                  </Typography>
                  <OpenInNewRoundedIcon className="p-crypto-dashboard__context-menu-external-icon" />
                </MenuItem>
              </>
            )}
          </Menu>
        </Stack>
      </Box>
    </Container>
  );
}
