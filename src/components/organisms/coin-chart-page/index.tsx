import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { CandlestickSeries, ColorType, createChart, HistogramSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWatchlist } from '@/hooks/use-watchlist';
import { fetchBscAlphaTokenMetrics, type BscAlphaTokenMetrics } from '@/services/binance-alpha';
import {
  fetchBinanceFuturesCandles,
  fetchBinanceFuturesAllTimeExtremes,
  fetchBinanceFuturesLatestCandle,
  fetchBinanceFuturesLastPrice,
  fetchBinanceFuturesPriceFormat,
  fetchBinanceFuturesSymbols,
  parseBinanceFuturesKlineMessage,
  parseBinanceFuturesTickerMessage,
  type BinanceFuturesCandle,
  type BinanceFuturesInterval,
  type BinanceFuturesPriceFormat,
  type BinanceFuturesPriceExtremes
} from '@/services/binance-futures';

const INTERVALS: Array<{ value: BinanceFuturesInterval; label: string }> = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' }
];
const LIVE_POLL_INTERVAL_MS = 1000;
const TARGET_FDV = 27_500_000_000;

type CandleDetails = Pick<BinanceFuturesCandle, 'open' | 'high' | 'low' | 'close' | 'volume'>;

const volumeFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});
const usdMetricFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2
});
const supplyFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2
});
const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const targetPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 8
});

function formatPrice(value: number, precision: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value);
}

function formatMetric(value: number | null, formatter: Intl.NumberFormat): string {
  return value === null ? 'No data' : formatter.format(value);
}

function getCoinMarketCapUrl(name: string | null, symbol: string): string {
  const baseAsset = symbol.replace(/(?:USDT|USDC)$/, '');
  const slug =
    (name ?? baseAsset)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || baseAsset.toLowerCase();
  return `https://coinmarketcap.com/currencies/${slug}/`;
}

function formatUtcDate(time: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC'
  }).format(time * 1000);
}

function mergeLatestCandle(
  candles: BinanceFuturesCandle[],
  nextCandle: BinanceFuturesCandle
): BinanceFuturesCandle[] {
  const latest = candles[candles.length - 1];
  if (!latest || nextCandle.time > latest.time) {
    return [...candles, nextCandle];
  }
  if (nextCandle.time === latest.time) {
    return [...candles.slice(0, -1), nextCandle];
  }
  return candles;
}

export function CoinChartPage() {
  const { symbol: routeSymbol = '' } = useParams();
  const symbol = routeSymbol.toUpperCase();
  const navigate = useNavigate();
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const [interval, setInterval] = useState<BinanceFuturesInterval>('1h');
  const [activeTab, setActiveTab] = useState<'chart' | 'data' | 'links'>('chart');
  const [candles, setCandles] = useState<BinanceFuturesCandle[]>([]);
  const [futuresSymbols, setFuturesSymbols] = useState<string[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<BscAlphaTokenMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [priceExtremes, setPriceExtremes] = useState<BinanceFuturesPriceExtremes | null>(null);
  const [extremesLoading, setExtremesLoading] = useState(true);
  const [extremesError, setExtremesError] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<CandleDetails | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceFormat, setPriceFormat] = useState<BinanceFuturesPriceFormat | null>(null);
  const [streamStatus, setStreamStatus] = useState<
    'connecting' | 'live' | 'polling' | 'reconnecting'
  >('connecting');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const updateChartRef = useRef<((data: BinanceFuturesCandle[]) => void) | null>(null);
  const historicalCandlesRef = useRef<BinanceFuturesCandle[]>([]);
  const lastStreamMessageAtRef = useRef(0);

  useEffect(() => {
    if (livePrice === null || !priceFormat) {
      document.title = `-- | ${symbol}`;
      return;
    }

    const formattedPrice = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: priceFormat.precision,
      maximumFractionDigits: priceFormat.precision
    }).format(livePrice);
    document.title = `${formattedPrice} | ${symbol}`;
  }, [livePrice, priceFormat, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCandles() {
      setLoading(true);
      setError(null);
      setPriceFormat(null);
      setCandles([]);
      setHoveredCandle(null);
      setLivePrice(null);
      setPriceError(null);
      setStreamStatus('connecting');
      lastStreamMessageAtRef.current = 0;
      historicalCandlesRef.current = [];

      try {
        const resultSymbols = await fetchBinanceFuturesSymbols();
        if (controller.signal.aborted) {
          return;
        }

        setFuturesSymbols(resultSymbols);
        const [resultCandles, resultPriceFormat] = await Promise.all([
          fetchBinanceFuturesCandles(symbol, interval, controller.signal),
          fetchBinanceFuturesPriceFormat(symbol)
        ]);
        if (controller.signal.aborted) {
          return;
        }

        historicalCandlesRef.current = resultCandles;
        setPriceFormat(resultPriceFormat);
        setLivePrice(resultCandles[resultCandles.length - 1].close);
        setCandles(resultCandles);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load Binance Futures candles.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCandles();
    return () => controller.abort();
  }, [interval, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentMetrics() {
      setMetricsLoading(true);
      setMetricsError(null);
      setCurrentMetrics(null);

      try {
        const result = await fetchBscAlphaTokenMetrics(symbol, controller.signal);
        if (!controller.signal.aborted) {
          setCurrentMetrics(result);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setMetricsError(
            loadError instanceof Error ? loadError.message : 'Unable to load current token data.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setMetricsLoading(false);
        }
      }
    }

    void loadCurrentMetrics();
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPriceExtremes() {
      setExtremesLoading(true);
      setExtremesError(null);
      setPriceExtremes(null);

      try {
        const result = await fetchBinanceFuturesAllTimeExtremes(symbol, controller.signal);
        if (!controller.signal.aborted) {
          setPriceExtremes(result);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setExtremesError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load all-time Futures prices.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setExtremesLoading(false);
        }
      }
    }

    void loadPriceExtremes();
    return () => controller.abort();
  }, [symbol]);

  const hasCandles = candles.length > 0;

  useEffect(() => {
    const container = chartContainerRef.current;
    if (activeTab !== 'chart' || !container || !hasCandles || !priceFormat || loading || error) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#181a20' },
        textColor: '#9ba8b5',
        attributionLogo: true
      },
      grid: {
        vertLines: { color: 'rgb(255 255 255 / 4%)' },
        horzLines: { color: 'rgb(255 255 255 / 4%)' }
      },
      rightPriceScale: { borderColor: 'rgb(255 255 255 / 10%)' },
      timeScale: {
        borderColor: 'rgb(255 255 255 / 10%)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceFormat: {
        type: 'price',
        precision: priceFormat.precision,
        minMove: priceFormat.minMove
      },
      priceLineVisible: false,
      upColor: '#0ecb81',
      downColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      borderVisible: false
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: ''
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const history = historicalCandlesRef.current;
    candleSeries.setData(history);
    volumeSeries.setData(
      history.map((candle) => ({
        time: candle.time,
        value: candle.volume,
        color: candle.close >= candle.open ? 'rgb(14 203 129 / 35%)' : 'rgb(246 70 93 / 35%)'
      }))
    );
    chart.timeScale().fitContent();

    updateChartRef.current = (data) => {
      if (data.length === 0) {
        return;
      }

      const latestCandle = data[data.length - 1];
      candleSeries.update(latestCandle);
      volumeSeries.update({
        time: latestCandle.time,
        value: latestCandle.volume,
        color:
          latestCandle.close >= latestCandle.open ? 'rgb(14 203 129 / 35%)' : 'rgb(246 70 93 / 35%)'
      });
    };

    chart.subscribeCrosshairMove((event) => {
      if (!event.point || !event.time) {
        setHoveredCandle(null);
        return;
      }

      const candle = event.seriesData.get(candleSeries);
      const volume = event.seriesData.get(volumeSeries);
      if (!candle || !('open' in candle) || !volume || !('value' in volume)) {
        setHoveredCandle(null);
        return;
      }

      setHoveredCandle({
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: volume.value
      });
    });

    return () => {
      updateChartRef.current = null;
      chart.remove();
    };
  }, [activeTab, error, hasCandles, interval, loading, priceFormat, symbol]);

  useEffect(() => {
    if (hasCandles) {
      updateChartRef.current?.(candles);
    }
  }, [candles, hasCandles]);

  useEffect(() => {
    if (!hasCandles || !priceFormat || loading || error) {
      return;
    }

    const controller = new AbortController();
    let timer: number | undefined;

    async function refreshLivePrice() {
      try {
        const [price, latestCandle] = await Promise.all([
          fetchBinanceFuturesLastPrice(symbol, controller.signal),
          fetchBinanceFuturesLatestCandle(symbol, interval, controller.signal)
        ]);
        if (!controller.signal.aborted) {
          setPriceError(null);
          if (Date.now() - lastStreamMessageAtRef.current > 3000) {
            setLivePrice(price);
            setStreamStatus('polling');
            setCandles((current) => mergeLatestCandle(current, latestCandle));
          }
        }
      } catch (priceLoadError) {
        if (!controller.signal.aborted) {
          if (Date.now() - lastStreamMessageAtRef.current > 3000) {
            setPriceError(
              priceLoadError instanceof Error
                ? priceLoadError.message
                : 'Unable to refresh live Futures data.'
            );
            setStreamStatus('reconnecting');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          timer = window.setTimeout(() => void refreshLivePrice(), LIVE_POLL_INTERVAL_MS);
        }
      }
    }

    void refreshLivePrice();
    return () => {
      controller.abort();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [error, hasCandles, interval, loading, priceFormat, symbol]);

  useEffect(() => {
    if (!hasCandles || !priceFormat || loading || error) {
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let reconnectDelay = 1000;

    function connect() {
      if (stopped) {
        return;
      }

      setStreamStatus(reconnectDelay > 1000 ? 'reconnecting' : 'connecting');
      const streamSymbol = symbol.toLowerCase();
      socket = new WebSocket(
        `wss://fstream.binance.com/stream?streams=${streamSymbol}@kline_${interval}/${streamSymbol}@ticker`
      );

      socket.addEventListener('open', () => {
        if (!stopped) {
          reconnectDelay = 1000;
        }
      });

      socket.addEventListener('message', (event) => {
        if (stopped || typeof event.data !== 'string') {
          return;
        }

        const candle = parseBinanceFuturesKlineMessage(event.data);
        const tickerPrice = parseBinanceFuturesTickerMessage(event.data);
        if (tickerPrice !== null || candle) {
          lastStreamMessageAtRef.current = Date.now();
          setStreamStatus('live');
          setPriceError(null);
        }

        if (tickerPrice !== null) {
          setLivePrice(tickerPrice);
        }

        if (!candle) {
          return;
        }

        setCandles((current) => mergeLatestCandle(current, candle));
      });

      socket.addEventListener('error', () => {
        socket?.close();
      });

      socket.addEventListener('close', () => {
        if (stopped) {
          return;
        }

        setStreamStatus('reconnecting');
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      });
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [error, hasCandles, interval, loading, priceFormat, symbol]);

  const displayedCandle = hoveredCandle ?? candles[candles.length - 1] ?? null;
  const currentUnlockPercent = currentMetrics?.unlockedPercent;
  const totalSupply = currentMetrics?.totalSupply;
  const marketCapAtTargetFdv =
    currentUnlockPercent === null || currentUnlockPercent === undefined
      ? null
      : (TARGET_FDV * currentUnlockPercent) / 100;
  const priceAtTargetFdv =
    totalSupply === null ||
    totalSupply === undefined ||
    !Number.isFinite(totalSupply) ||
    totalSupply <= 0
      ? null
      : TARGET_FDV / totalSupply;
  const formatExtreme = (extreme: 'ath' | 'atl'): string => {
    if (extremesLoading) {
      return 'Loading…';
    }
    if (extremesError || !priceExtremes || !priceFormat) {
      return 'No data';
    }

    const value = priceExtremes[extreme];
    return `${formatPrice(value.price, priceFormat.precision)} · ${formatUtcDate(value.time)}`;
  };
  const watchlisted = isWatchlisted(symbol);
  const exchangeUrl = `https://www.binance.com/en/futures/${encodeURIComponent(symbol)}`;
  const coinMarketCapUrl = getCoinMarketCapUrl(currentMetrics?.name ?? null, symbol);

  return (
    <Container maxWidth="lg" className="o-coin-chart-page">
      <Box component="main" className="o-coin-chart-page__main">
        <Stack spacing={3}>
          <Box className="o-coin-chart-page__heading">
            <Autocomplete
              className="o-coin-chart-page__contract-picker"
              options={futuresSymbols}
              value={futuresSymbols.find((futuresSymbol) => futuresSymbol === symbol) ?? null}
              onChange={(_, selectedSymbol) => {
                if (selectedSymbol) {
                  navigate(`/chart/${encodeURIComponent(selectedSymbol)}`);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Futures pair"
                  placeholder="Search pair"
                  size="small"
                />
              )}
            />
            <Stack direction="row" spacing={1.5} className="o-coin-chart-page__heading-actions">
              <Button
                className="o-coin-chart-page__watchlist-button"
                size="small"
                variant="outlined"
                onClick={() => toggleWatchlist(symbol)}
              >
                {watchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </Button>
              <Button
                className="o-coin-chart-page__exchange-button"
                size="small"
                component="a"
                href={exchangeUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                endIcon={<ArrowOutwardRoundedIcon />}
              >
                Open on Binance
              </Button>
            </Stack>
          </Box>

          <Paper elevation={0} className="o-coin-chart-page__chart-panel">
            <Tabs
              value={activeTab}
              onChange={(_, value: 'chart' | 'data' | 'links') => setActiveTab(value)}
              aria-label="Futures views"
              className="o-coin-chart-page__tabs"
            >
              <Tab
                label="Chart"
                value="chart"
                id="futures-chart-tab"
                aria-controls="futures-chart-panel"
              />
              <Tab
                label="Data"
                value="data"
                id="futures-data-tab"
                aria-controls="futures-data-panel"
              />
              <Tab
                label="Links"
                value="links"
                id="futures-links-tab"
                aria-controls="futures-links-panel"
              />
            </Tabs>

            {activeTab === 'chart' ? (
              <Box role="tabpanel" id="futures-chart-panel" aria-labelledby="futures-chart-tab">
                <Box className="o-coin-chart-page__toolbar">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={interval}
                    aria-label="Chart interval"
                    className="o-coin-chart-page__interval-group"
                    onChange={(_, value: BinanceFuturesInterval | null) => {
                      if (value) {
                        setInterval(value);
                      }
                    }}
                  >
                    {INTERVALS.map(({ value, label }) => (
                      <ToggleButton key={value} value={value}>
                        {label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  {displayedCandle && priceFormat && (
                    <Stack
                      direction="row"
                      spacing={1.5}
                      className="o-coin-chart-page__candle-data"
                      aria-label="Candle OHLCV data"
                    >
                      <Typography variant="caption" className="o-coin-chart-page__candle-value">
                        <Box component="span" className="o-coin-chart-page__candle-label">
                          O
                        </Box>
                        {formatPrice(displayedCandle.open, priceFormat.precision)}
                      </Typography>
                      <Typography variant="caption" className="o-coin-chart-page__candle-value">
                        <Box component="span" className="o-coin-chart-page__candle-label">
                          H
                        </Box>
                        {formatPrice(displayedCandle.high, priceFormat.precision)}
                      </Typography>
                      <Typography variant="caption" className="o-coin-chart-page__candle-value">
                        <Box component="span" className="o-coin-chart-page__candle-label">
                          L
                        </Box>
                        {formatPrice(displayedCandle.low, priceFormat.precision)}
                      </Typography>
                      <Typography variant="caption" className="o-coin-chart-page__candle-value">
                        <Box component="span" className="o-coin-chart-page__candle-label">
                          C
                        </Box>
                        {formatPrice(displayedCandle.close, priceFormat.precision)}
                      </Typography>
                      <Typography variant="caption" className="o-coin-chart-page__candle-value">
                        <Box component="span" className="o-coin-chart-page__candle-label">
                          Vol
                        </Box>
                        {volumeFormatter.format(displayedCandle.volume)}
                      </Typography>
                    </Stack>
                  )}
                  <Box
                    className={`o-coin-chart-page__live-status o-coin-chart-page__live-status--${streamStatus}`}
                    role="status"
                    aria-live="polite"
                  >
                    <Box
                      component="span"
                      className="o-coin-chart-page__live-dot"
                      aria-hidden="true"
                    />
                    <Typography variant="caption">
                      {streamStatus === 'live'
                        ? 'Live'
                        : streamStatus === 'reconnecting'
                          ? 'Reconnecting'
                          : streamStatus === 'polling'
                            ? 'Polling'
                            : 'Connecting'}
                    </Typography>
                  </Box>
                </Box>

                {priceError && (
                  <Alert severity="warning" className="o-coin-chart-page__alert">
                    Live price update unavailable: {priceError}
                  </Alert>
                )}

                {error ? (
                  <Alert severity="error" className="o-coin-chart-page__alert">
                    {error}
                  </Alert>
                ) : loading ? (
                  <Box className="o-coin-chart-page__state">
                    <CircularProgress size={28} />
                    <Typography color="text.secondary">Loading Futures candles…</Typography>
                  </Box>
                ) : (
                  <Box
                    ref={chartContainerRef}
                    className="o-coin-chart-page__canvas"
                    role="img"
                    aria-label={`${symbol} ${interval} candlestick chart with volume`}
                  />
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="o-coin-chart-page__note"
                >
                  Candlestick and volume data from Binance USDⓈ-M Futures.{' '}
                  <MuiLink
                    href="https://www.tradingview.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                  >
                    Charts by TradingView
                  </MuiLink>
                </Typography>
              </Box>
            ) : activeTab === 'data' ? (
              <Box
                role="tabpanel"
                id="futures-data-panel"
                aria-labelledby="futures-data-tab"
                className="o-coin-chart-page__data-panel"
              >
                {metricsError ? (
                  <Alert severity="error" className="o-coin-chart-page__alert">
                    {metricsError}
                  </Alert>
                ) : metricsLoading ? (
                  <Box className="o-coin-chart-page__state">
                    <CircularProgress size={28} />
                    <Typography color="text.secondary">Loading current token data…</Typography>
                  </Box>
                ) : (
                  <Box className="o-coin-chart-page__data-content">
                    <Box className="o-coin-chart-page__data-heading">
                      <Typography variant="h6">Overview</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {symbol} · Current and all-time
                      </Typography>
                    </Box>
                    {extremesError && (
                      <Alert severity="error" className="o-coin-chart-page__alert">
                        {extremesError}
                      </Alert>
                    )}
                    <Box component="dl" className="o-coin-chart-page__data-list">
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          Market Cap
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatMetric(currentMetrics?.marketCap ?? null, usdMetricFormatter)}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          FDV
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatMetric(currentMetrics?.fdv ?? null, usdMetricFormatter)}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          Circulating Supply
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatMetric(currentMetrics?.circulatingSupply ?? null, supplyFormatter)}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          Total Supply
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatMetric(currentMetrics?.totalSupply ?? null, supplyFormatter)}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          Token Unlock
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {currentUnlockPercent === null || currentUnlockPercent === undefined
                            ? 'No data'
                            : `${percentFormatter.format(currentUnlockPercent)}%`}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          ATH
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatExtreme('ath')}
                        </Typography>
                      </Box>
                      <Box className="o-coin-chart-page__data-row">
                        <Typography component="dt" className="o-coin-chart-page__metric-label">
                          ATL
                        </Typography>
                        <Typography component="dd" className="o-coin-chart-page__metric-value">
                          {formatExtreme('atl')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="o-coin-chart-page__data-section">
                      <Box className="o-coin-chart-page__data-heading">
                        <Typography variant="subtitle1">Data at ATH</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Historical snapshot
                        </Typography>
                      </Box>
                      <Box component="dl" className="o-coin-chart-page__data-list">
                        <Box className="o-coin-chart-page__data-row">
                          <Typography component="dt" className="o-coin-chart-page__metric-label">
                            Market Cap
                          </Typography>
                          <Typography component="dd" className="o-coin-chart-page__metric-value">
                            No data
                          </Typography>
                        </Box>
                        <Box className="o-coin-chart-page__data-row">
                          <Typography component="dt" className="o-coin-chart-page__metric-label">
                            FDV
                          </Typography>
                          <Typography component="dd" className="o-coin-chart-page__metric-value">
                            No data
                          </Typography>
                        </Box>
                        <Box className="o-coin-chart-page__data-row">
                          <Typography component="dt" className="o-coin-chart-page__metric-label">
                            Token Unlock
                          </Typography>
                          <Typography component="dd" className="o-coin-chart-page__metric-value">
                            No data
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box className="o-coin-chart-page__data-section">
                      <Box className="o-coin-chart-page__data-heading">
                        <Typography variant="subtitle1">Data at $27.5B FDV</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Based on current supply
                        </Typography>
                      </Box>
                      <Box component="dl" className="o-coin-chart-page__data-list">
                        <Box className="o-coin-chart-page__data-row">
                          <Typography component="dt" className="o-coin-chart-page__metric-label">
                            Price
                          </Typography>
                          <Typography component="dd" className="o-coin-chart-page__metric-value">
                            {formatMetric(priceAtTargetFdv, targetPriceFormatter)}
                          </Typography>
                        </Box>
                        <Box className="o-coin-chart-page__data-row">
                          <Typography component="dt" className="o-coin-chart-page__metric-label">
                            Market Cap
                          </Typography>
                          <Typography component="dd" className="o-coin-chart-page__metric-value">
                            {formatMetric(marketCapAtTargetFdv, usdMetricFormatter)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                role="tabpanel"
                id="futures-links-panel"
                aria-labelledby="futures-links-tab"
                className="o-coin-chart-page__links-panel"
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  className="o-coin-chart-page__resource-links"
                >
                  <MuiLink
                    href={exchangeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    color="inherit"
                    className="o-coin-chart-page__resource-link"
                  >
                    <Box
                      component="img"
                      src="https://bin.bnbstatic.com/static/images/common/favicon.ico"
                      alt=""
                      referrerPolicy="no-referrer"
                      className="o-coin-chart-page__resource-icon"
                    />
                    <Typography component="span">Binance Futures</Typography>
                    <ArrowOutwardRoundedIcon fontSize="small" />
                  </MuiLink>
                  <MuiLink
                    href={`https://www.coinglass.com/tv/Binance_${encodeURIComponent(symbol)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    color="inherit"
                    className="o-coin-chart-page__resource-link"
                  >
                    <Box
                      component="img"
                      src="https://cdn.coinglasscdn.com/static/icon_200.png"
                      alt=""
                      referrerPolicy="no-referrer"
                      className="o-coin-chart-page__resource-icon"
                    />
                    <Typography component="span">CoinGlass</Typography>
                    <ArrowOutwardRoundedIcon fontSize="small" />
                  </MuiLink>
                  <MuiLink
                    href={coinMarketCapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="none"
                    color="inherit"
                    className="o-coin-chart-page__resource-link"
                  >
                    <Box
                      component="img"
                      src="https://coinmarketcap.com/favicon.ico"
                      alt=""
                      referrerPolicy="no-referrer"
                      className="o-coin-chart-page__resource-icon"
                    />
                    <Typography component="span">CoinMarketCap</Typography>
                    <ArrowOutwardRoundedIcon fontSize="small" />
                  </MuiLink>
                </Stack>
              </Box>
            )}
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}
