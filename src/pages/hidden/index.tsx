import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
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
import { useHiddenCoins } from '@/hooks/use-hidden-coins';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';
import { getCoinMarketCapUrl } from '@/services/coinmarketcap';

function getHiddenTokenCoinMarketCapUrl(
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

export function HiddenCoinsPage() {
  const { hiddenCoins, unhideCoin, clearHiddenCoins, feedback, clearFeedback } = useHiddenCoins();
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
            loadError instanceof Error ? loadError.message : 'Unable to load hidden coin data.'
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
  const hiddenTokens = useMemo(
    () => hiddenCoins.map((symbol) => ({ symbol, token: tokensBySymbol.get(symbol) ?? null })),
    [hiddenCoins, tokensBySymbol]
  );
  const tableRows = useMemo<TokenTableRowData[]>(
    () =>
      hiddenTokens.map(({ symbol, token }) => ({
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
    [hiddenTokens]
  );

  function openTokenMenu(symbol: string, mouseX: number, mouseY: number) {
    const hiddenToken = hiddenTokens.find((candidate) => candidate.symbol === symbol);
    if (!hiddenToken) return;

    const token = hiddenToken.token;
    setContextMenu({
      symbol,
      tokenSymbol: token?.symbol ?? symbol.replace(/(?:USDT|USDC)$/, ''),
      iconUrl: token?.iconUrl ?? null,
      coinMarketCapUrl: getHiddenTokenCoinMarketCapUrl(symbol, token),
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
    const hiddenToken = hiddenTokens.find((candidate) => candidate.symbol === symbol);
    if (hiddenToken && hiddenToken.symbol !== contextMenu?.symbol) {
      openTokenMenu(hiddenToken.symbol, event.clientX, event.clientY);
    } else if (!hiddenToken) {
      setContextMenu(null);
    }
  }

  return (
    <Container maxWidth="lg" className="p-hidden-coins">
      <Box component="main" className="p-hidden-coins__main">
        <Stack spacing={3}>
          <Box className="p-hidden-coins__heading">
            <Box>
              <Typography
                variant="h1"
                sx={{ mt: 0.5, fontSize: { xs: 34, sm: 46 } }}
                className="p-hidden-coins__title"
              >
                Hidden coins
              </Typography>
              <Typography color="text.secondary">
                Coins hidden here will not appear on Home.
              </Typography>
            </Box>
            {hiddenTokens.length > 0 && (
              <Box className="p-hidden-coins__heading-actions">
                <Button
                  variant="outlined"
                  startIcon={<VisibilityRoundedIcon />}
                  onClick={() => setConfirmClearOpen(true)}
                  className="p-hidden-coins__clear-all"
                >
                  Unhide all
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={loading}
                  className="p-hidden-coins__refresh"
                >
                  Refresh
                </Button>
              </Box>
            )}
          </Box>

          {error && <Alert severity={tokens.length > 0 ? 'warning' : 'error'}>{error}</Alert>}

          {loading && hiddenTokens.length > 0 ? (
            <Box className="p-hidden-coins__state">
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading hidden coin data…</Typography>
            </Box>
          ) : hiddenTokens.length === 0 ? (
            <Box className="p-hidden-coins__empty">
              <Typography variant="h6">No hidden coins</Typography>
              <Typography color="text.secondary">
                Hide a coin from its row menu on Home to manage it here.
              </Typography>
            </Box>
          ) : (
            <Box className="p-hidden-coins__list-panel">
              <TokenTable
                ariaLabel="Coins hidden from Home"
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
                    isWatchlisted: false,
                    isHidden: true
                  }
                : null
            }
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null
            }
            showWatchlistAction={false}
            onClose={() => setContextMenu(null)}
            onToggleHidden={() => {
              if (contextMenu) {
                unhideCoin(contextMenu.symbol);
              }
            }}
            onContextMenuOverlay={handleContextMenuOnOverlay}
          />
          <WatchlistFeedback feedback={feedback} context="home" onClose={clearFeedback} />
          <Dialog
            open={confirmClearOpen}
            onClose={() => setConfirmClearOpen(false)}
            aria-labelledby="p-hidden-coins-clear-title"
          >
            <DialogTitle id="p-hidden-coins-clear-title">Unhide all hidden coins?</DialogTitle>
            <DialogContent>
              <Typography color="text.secondary">
                Every coin in this list will appear on Home again.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  clearHiddenCoins();
                  setConfirmClearOpen(false);
                }}
              >
                Unhide all
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Box>
    </Container>
  );
}
