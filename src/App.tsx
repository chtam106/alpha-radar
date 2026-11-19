import type { ReactNode } from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import {
  Box,
  Chip,
  Container,
  CssBaseline,
  Paper,
  Stack,
  ThemeProvider,
  Typography,
  createTheme
} from '@mui/material';
import CurrencyBitcoinRoundedIcon from '@mui/icons-material/CurrencyBitcoinRounded';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#9cf5c4' },
    background: { default: '#090d12', paper: '#111820' },
    text: { primary: '#f2f5f7', secondary: '#9ba8b5' }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    h1: { fontWeight: 650, letterSpacing: '-0.045em' },
    h2: { fontWeight: 600, letterSpacing: '-0.025em' }
  }
});

type WorkspaceFeature = {
  title: string;
  description: string;
  icon: ReactNode;
};

const workspaceFeatures: WorkspaceFeature[] = [
  {
    title: 'Market data',
    description: 'Connect a price provider to explore live assets and market movement.',
    icon: <ShowChartRoundedIcon />
  },
  {
    title: 'Watchlist',
    description: 'Keep the coins and tokens you follow together in one place.',
    icon: <StarBorderRoundedIcon />
  },
  {
    title: 'Portfolio',
    description: 'Build a portfolio view when you are ready to add account data.',
    icon: <AccountBalanceWalletOutlinedIcon />
  }
];

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell">
        <Container maxWidth="lg" className="app-content">
          <Box component="header" className="topbar">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box className="brand-mark" aria-hidden="true">
                <CurrencyBitcoinRoundedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Crypto Desk
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Personal market workspace
                </Typography>
              </Box>
            </Stack>
            <Chip size="small" variant="outlined" label="STARTER PROJECT" />
          </Box>

          <Box component="main" className="dashboard-content">
            <Stack spacing={4}>
              <Box className="section-heading">
                <Box>
                  <Typography
                    variant="overline"
                    color="primary.main"
                    sx={{ fontWeight: 700, letterSpacing: '0.14em' }}
                  >
                    MARKET OVERVIEW
                  </Typography>
                  <Typography variant="h1" sx={{ mt: 0.5, fontSize: { xs: 36, sm: 48 } }}>
                    Your crypto workspace
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 620 }}>
                    A clean foundation for tracking digital assets. Connect a market-data provider
                    to bring live prices and charts into your dashboard.
                  </Typography>
                </Box>
                <Chip
                  className="data-status"
                  icon={<Box component="span" className="status-dot" />}
                  label="NO DATA SOURCE"
                  variant="outlined"
                />
              </Box>

              <Paper className="hero-panel" elevation={0} component="section">
                <Box className="hero-copy">
                  <Typography variant="h2" sx={{ fontSize: { xs: 23, sm: 28 } }}>
                    Ready for your first integration
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 600 }}>
                    The app shell, theme, and tooling are in place. No prices, wallet balances, or
                    market claims are shown until a trusted data source is configured.
                  </Typography>
                </Box>
                <Typography className="hero-symbol" aria-hidden="true">
                  ₿
                </Typography>
              </Paper>

              <Box>
                <Typography variant="h2" sx={{ fontSize: 20, mb: 2 }}>
                  Workspace modules
                </Typography>
                <Box className="overview-grid">
                  {workspaceFeatures.map((feature) => (
                    <Paper
                      key={feature.title}
                      className="feature-card"
                      elevation={0}
                      component="section"
                    >
                      <Box className="feature-icon" aria-hidden="true">
                        {feature.icon}
                      </Box>
                      <Typography variant="h3" sx={{ fontSize: 17, fontWeight: 650 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {feature.description}
                      </Typography>
                      <Typography className="module-status">NOT CONNECTED</Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Stack>
          </Box>

          <Box component="footer" className="app-footer">
            <Typography variant="caption" color="text.secondary">
              React · TypeScript · Material UI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Market data and wallet connections are not configured.
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
