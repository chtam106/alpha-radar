import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material';
import { useEffect } from 'react';
import { ScrollToEdgeButton } from '@/components/atoms/scroll-to-edge-button';
import { GlobalHeader } from '@/components/organisms/global-header';
import { HomePage } from '@/pages/home';
import { appTheme } from '@/theme';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import.meta.glob('./**/*.scss', { eager: true });

const CoinChartPage = lazy(() =>
  import('@/pages/chart').then(({ CoinChartPage: Page }) => ({
    default: Page
  }))
);
const WatchlistPage = lazy(() =>
  import('@/pages/watchlist').then(({ WatchlistPage: Page }) => ({
    default: Page
  }))
);

export function AppRoutes() {
  const { pathname } = useLocation();
  const chartSymbol = pathname.startsWith('/chart/') ? pathname.slice('/chart/'.length) : null;

  useEffect(() => {
    document.title = chartSymbol
      ? `${chartSymbol.toUpperCase()} | Binance Futures`
      : pathname === '/watchlist'
        ? 'Watchlist | Alpha Radar'
        : 'Alpha Radar | Binance';
  }, [chartSymbol, pathname]);

  return (
    <Box className="o-app-shell">
      <GlobalHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/alpha-radar" element={<Navigate to="/" replace />} />
        <Route
          path="/chart/:symbol"
          element={
            <Suspense
              fallback={
                <Box className="o-app-shell__route-loading">
                  <CircularProgress aria-label="Loading chart page" />
                </Box>
              }
            >
              <CoinChartPage />
            </Suspense>
          }
        />
        <Route
          path="/watchlist"
          element={
            <Suspense
              fallback={
                <Box className="o-app-shell__route-loading">
                  <CircularProgress aria-label="Loading watchlist page" />
                </Box>
              }
            >
              <WatchlistPage />
            </Suspense>
          }
        />
        <Route path="/alpha-bsc" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!pathname.startsWith('/chart/') && <ScrollToEdgeButton />}
    </Box>
  );
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
