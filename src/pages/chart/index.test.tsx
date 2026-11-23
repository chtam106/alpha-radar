import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UTCTimestamp } from 'lightweight-charts';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BscAlphaTokenMetrics } from '@/services/binance-alpha';
import type { BinanceFuturesCandle } from '@/services/binance-futures';

const alphaMetricsMock = vi.hoisted(() => ({
  fetchBscAlphaTokenMetrics: vi.fn()
}));
const futuresMock = vi.hoisted(() => ({
  fetchBinanceFuturesAllTimeExtremes: vi.fn(),
  fetchBinanceFuturesCandles: vi.fn(),
  fetchBinanceFuturesLatestCandle: vi.fn(),
  fetchBinanceFuturesLastPrice: vi.fn(),
  fetchBinanceFuturesPriceFormat: vi.fn(),
  fetchBinanceFuturesSymbols: vi.fn(),
  parseBinanceFuturesKlineMessage: vi.fn(),
  parseBinanceFuturesTickerMessage: vi.fn()
}));
const chartMocks = vi.hoisted(() => {
  const series = {
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
    setData: vi.fn(),
    update: vi.fn()
  };
  const chart = {
    addSeries: vi.fn(() => series),
    remove: vi.fn(),
    subscribeCrosshairMove: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() }))
  };
  return { chart, createChart: vi.fn(() => chart), series };
});

vi.mock('@/services/binance-alpha', () => alphaMetricsMock);
vi.mock('@/services/binance-futures', () => futuresMock);
vi.mock('lightweight-charts', () => ({
  CandlestickSeries: {},
  ColorType: { Solid: 'solid' },
  createChart: chartMocks.createChart,
  HistogramSeries: {}
}));

import { CoinChartPage } from './index';

class MockWebSocket extends EventTarget {
  static instances: MockWebSocket[] = [];

  readonly url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.dispatchEvent(new Event('close'));
  }

  sendMessage(data: string): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

const candle: BinanceFuturesCandle = {
  time: 1_700_000_000 as UTCTimestamp,
  open: 1,
  high: 2,
  low: 0.5,
  close: 1.5,
  volume: 100
};

const metrics: BscAlphaTokenMetrics = {
  symbol: 'ALPHA',
  name: 'Alpha Token',
  contractAddress: '0xalpha',
  cmcSlug: 'alpha-token',
  marketCap: 3_500_000,
  fdv: 14_000_000,
  circulatingSupply: 250_000,
  totalSupply: 1_000_000,
  unlockedPercent: 25
};

function renderChart() {
  return render(
    <MemoryRouter initialEntries={['/chart/alphausdt']}>
      <Routes>
        <Route path="/chart/:symbol" element={<CoinChartPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Chart page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    alphaMetricsMock.fetchBscAlphaTokenMetrics.mockReset().mockResolvedValue(metrics);
    futuresMock.fetchBinanceFuturesAllTimeExtremes.mockReset().mockResolvedValue({
      ath: { price: 2.5, time: 1_700_000_000 },
      atl: { price: 0.25, time: 1_600_000_000 }
    });
    futuresMock.fetchBinanceFuturesCandles.mockReset().mockResolvedValue([candle]);
    futuresMock.fetchBinanceFuturesLatestCandle.mockReset().mockResolvedValue(candle);
    futuresMock.fetchBinanceFuturesLastPrice.mockReset().mockResolvedValue(1.5);
    futuresMock.fetchBinanceFuturesPriceFormat.mockReset().mockResolvedValue({
      precision: 2,
      minMove: 0.01
    });
    futuresMock.fetchBinanceFuturesSymbols.mockReset().mockResolvedValue(['ALPHAUSDT', 'BETAUSDT']);
    futuresMock.parseBinanceFuturesKlineMessage.mockReset().mockReturnValue(null);
    futuresMock.parseBinanceFuturesTickerMessage.mockReset().mockReturnValue(null);
    chartMocks.createChart.mockClear();
    chartMocks.chart.remove.mockClear();
  });

  it('loads chart data, renders a chart, and switches the candle interval', async () => {
    renderChart();

    expect(
      await screen.findByRole('img', { name: /ALPHAUSDT 1h candlestick chart/ })
    ).toBeInTheDocument();
    expect(futuresMock.fetchBinanceFuturesCandles).toHaveBeenCalledWith(
      'ALPHAUSDT',
      '1h',
      expect.any(AbortSignal)
    );
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalledTimes(1));
    expect(chartMocks.createChart).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ layout: expect.objectContaining({ fontSize: 16 }) })
    );
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    expect(MockWebSocket.instances[0].url).toContain('alphausdt@kline_1h');

    fireEvent.click(screen.getByRole('button', { name: '4h' }));
    await screen.findByRole('img', { name: /ALPHAUSDT 4h candlestick chart/ });
    expect(futuresMock.fetchBinanceFuturesCandles).toHaveBeenCalledWith(
      'ALPHAUSDT',
      '4h',
      expect.any(AbortSignal)
    );
    expect(chartMocks.chart.remove).toHaveBeenCalled();
    expect(MockWebSocket.instances.some(({ url }) => url.includes('@kline_4h'))).toBe(true);
  });

  it('switches Futures pairs from the searchable contract picker', async () => {
    renderChart();
    await screen.findByRole('img', { name: /ALPHAUSDT 1h candlestick chart/ });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(await screen.findByRole('option', { name: 'BETAUSDT' }));

    await waitFor(() => {
      expect(futuresMock.fetchBinanceFuturesCandles).toHaveBeenCalledWith(
        'BETAUSDT',
        '1h',
        expect.any(AbortSignal)
      );
    });
    expect(
      await screen.findByRole('img', { name: /BETAUSDT 1h candlestick chart/ })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(MockWebSocket.instances.some(({ url }) => url.includes('betausdt'))).toBe(true)
    );
  });

  it('updates live status and watchlist state from the chart controls', async () => {
    renderChart();
    await screen.findByRole('img', { name: /ALPHAUSDT 1h candlestick chart/ });
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    futuresMock.parseBinanceFuturesTickerMessage.mockReturnValue(1.75);
    futuresMock.parseBinanceFuturesKlineMessage.mockReturnValue({
      ...candle,
      close: 1.75
    });
    MockWebSocket.instances[0].sendMessage('ticker message');

    expect(await screen.findByRole('status')).toHaveTextContent('Live');
    await waitFor(() => expect(document.title).toBe('1.75 | ALPHAUSDT'));

    fireEvent.click(screen.getByRole('button', { name: 'Add to Watchlist' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('["ALPHAUSDT"]');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove from Watchlist' }));
    await waitFor(() => {
      expect(window.localStorage.getItem('crypto-dashboard:watchlist')).toBe('[]');
    });
  });

  it('renders current metrics, all-time extrema, and external research links', async () => {
    renderChart();
    await screen.findByRole('img', { name: /ALPHAUSDT 1h candlestick chart/ });

    fireEvent.click(screen.getByRole('tab', { name: 'Data' }));
    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('$3.5M')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText(/Nov 14, 2023/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Links' }));
    expect(screen.getByRole('link', { name: /Binance Futures/ })).toHaveAttribute(
      'href',
      'https://www.binance.com/en/futures/ALPHAUSDT'
    );
    expect(screen.getByRole('link', { name: /CoinGlass/ })).toHaveAttribute(
      'href',
      'https://www.coinglass.com/tv/Binance_ALPHAUSDT'
    );
    expect(screen.getByRole('link', { name: /CoinMarketCap/ })).toHaveAttribute(
      'href',
      'https://coinmarketcap.com/currencies/alpha-token/'
    );
  });

  it('displays candle API errors and ends the loading state', async () => {
    futuresMock.fetchBinanceFuturesCandles.mockRejectedValue(
      new Error('Binance Futures API returned HTTP 503 for ALPHAUSDT.')
    );
    renderChart();

    expect(
      await screen.findByText('Binance Futures API returned HTTP 503 for ALPHAUSDT.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading Futures candles…')).not.toBeInTheDocument();
  });

  it('surfaces current-metrics API errors in the Data view', async () => {
    alphaMetricsMock.fetchBscAlphaTokenMetrics.mockRejectedValue(
      new Error('Binance returned HTTP 502.')
    );
    renderChart();
    await screen.findByRole('img', { name: /ALPHAUSDT 1h candlestick chart/ });

    fireEvent.click(screen.getByRole('tab', { name: 'Data' }));
    expect(await screen.findByText('Binance returned HTTP 502.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Binance returned HTTP 502.');
  });

  it('shows live price and historical-data API failures in their respective views', async () => {
    futuresMock.fetchBinanceFuturesLastPrice.mockRejectedValue(
      new Error('Binance Futures ticker returned HTTP 503 for ALPHAUSDT.')
    );
    futuresMock.fetchBinanceFuturesAllTimeExtremes.mockRejectedValue(
      new Error('Binance Futures API returned HTTP 502 for ALPHAUSDT.')
    );
    renderChart();

    expect(
      await screen.findByText(
        'Live price update unavailable: Binance Futures ticker returned HTTP 503 for ALPHAUSDT.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');

    fireEvent.click(screen.getByRole('tab', { name: 'Data' }));
    expect(
      await screen.findByText('Binance Futures API returned HTTP 502 for ALPHAUSDT.')
    ).toBeInTheDocument();
  });
});
