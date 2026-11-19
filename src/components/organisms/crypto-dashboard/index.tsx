import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { Box, Container, Stack, Typography } from '@mui/material';
import { DataSourceStatus } from '../../atoms/data-source-status';
import { HeroPanel } from '../../molecules/hero-panel';
import { TopBar } from '../../molecules/top-bar';
import { WorkspaceFeatureCard } from '../../molecules/workspace-feature-card';

const workspaceFeatures = [
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

export function CryptoDashboard() {
  return (
    <Container maxWidth="lg" className="o-crypto-dashboard">
      <TopBar />

      <Box component="main" className="o-crypto-dashboard__main">
        <Stack spacing={4}>
          <Box className="o-crypto-dashboard__heading">
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
                A clean foundation for tracking digital assets. Connect a market-data provider to
                bring live prices and charts into your dashboard.
              </Typography>
            </Box>
            <DataSourceStatus />
          </Box>

          <HeroPanel />

          <Box>
            <Typography variant="h2" sx={{ fontSize: 20, mb: 2 }}>
              Workspace modules
            </Typography>
            <Box className="o-crypto-dashboard__grid">
              {workspaceFeatures.map((feature) => (
                <WorkspaceFeatureCard key={feature.title} {...feature} />
              ))}
            </Box>
          </Box>
        </Stack>
      </Box>

      <Box component="footer" className="o-crypto-dashboard__footer">
        <Typography variant="caption" color="text.secondary">
          React · TypeScript · Material UI
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Market data and wallet connections are not configured.
        </Typography>
      </Box>
    </Container>
  );
}
