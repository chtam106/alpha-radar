import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react';
import { TokenContextMenu } from '@/components/molecules/token-context-menu';
import { WatchlistFeedback } from '@/components/molecules/watchlist-feedback';
import { TokenTable, type TokenTableRowData } from '@/components/organisms/token-table';
import { useWatchlist } from '@/hooks/use-watchlist';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';
import { getCoinMarketCapUrl } from '@/services/coinmarketcap';

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
  const { watchlist, toggleWatchlist, clearWatchlist, feedback, clearFeedback } = useWatchlist();
  const [contextMenu, setContextMenu] = useState<{
    symbol: string;
    tokenSymbol: string;
    iconUrl: string | null;
    coinMarketCapUrl: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [tokens, setTokens] = useState<BscAlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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
  const tableRows = useMemo<TokenTableRowData[]>(
    () =>
      watchedTokens.map(({ symbol, token }) => ({
        id: symbol,
        futuresSymbol: symbol,
        symbol: token?.symbol ?? symbol.replace(/(?:USDT|USDC)$/, ''),
        liquidity: token?.liquidity ?? null,
        iconUrl: token?.iconUrl ?? null,
        price: token?.price ?? null,
        marketCap: token?.marketCap ?? null,
        fdv: token?.fdv ?? null,
        totalSupply: token?.totalSupply ?? null,
        unlockedPercent: token?.unlockedPercent ?? null,
        circulatingSupply: token?.circulatingSupply ?? null
      })),
    [watchedTokens]
  );

  function openTokenMenu(symbol: string, mouseX: number, mouseY: number) {
    const token = tokensBySymbol.get(symbol.toUpperCase()) ?? null;
    setContextMenu({
      symbol,
      tokenSymbol: token?.symbol ?? symbol.replace(/(?:USDT|USDC)$/, ''),
      iconUrl: token?.iconUrl ?? null,
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
      openTokenMenu(watchedToken.symbol, event.clientX, event.clientY);
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
            </Box>
            {watchedTokens.length > 0 && (
              <Box className="p-watchlist-page__heading-actions">
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteSweepRoundedIcon />}
                  onClick={() => setConfirmClearOpen(true)}
                  className="p-watchlist-page__clear-all"
                >
                  Remove all
                </Button>
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
            )}
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
                Tap or click a coin to open its menu, then choose Add to watchlist.
              </Typography>
            </Box>
          ) : (
            <Box className="p-watchlist-page__list-panel">
              <TokenTable
                ariaLabel="Saved futures watchlist"
                rows={tableRows}
                onOpenMenu={openTokenMenu}
              />
            </Box>
          )}
          <TokenContextMenu
            token={
              contextMenu
                ? {
                    symbol: contextMenu.tokenSymbol,
                    iconUrl: contextMenu.iconUrl,
                    futuresSymbol: contextMenu.symbol,
                    coinMarketCapUrl: contextMenu.coinMarketCapUrl,
                    isWatchlisted: true,
                    isHidden: false
                  }
                : null
            }
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null
            }
            showHiddenAction={false}
            onClose={() => setContextMenu(null)}
            onToggleWatchlist={() => {
              if (contextMenu) {
                toggleWatchlist(contextMenu.symbol);
              }
            }}
            onContextMenuOverlay={handleContextMenuOnOverlay}
          />
          <WatchlistFeedback feedback={feedback} onClose={clearFeedback} />
          <Dialog
            open={confirmClearOpen}
            onClose={() => setConfirmClearOpen(false)}
            aria-labelledby="p-watchlist-page-clear-title"
          >
            <DialogTitle id="p-watchlist-page-clear-title">
              Remove all coins from your watchlist?
            </DialogTitle>
            <DialogContent>
              <Typography color="text.secondary">
                This removes every saved coin from the watchlist.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
              <Button
                color="error"
                onClick={() => {
                  clearWatchlist();
                  setConfirmClearOpen(false);
                }}
              >
                Remove all
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Box>
    </Container>
  );
}
