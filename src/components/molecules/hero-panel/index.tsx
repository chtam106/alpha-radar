import { Box, Paper, Typography } from '@mui/material';

export function HeroPanel() {
  return (
    <Paper className="c-hero-panel" elevation={0} component="section">
      <Box className="c-hero-panel__copy">
        <Typography variant="h2" sx={{ fontSize: { xs: 23, sm: 28 } }}>
          Ready for your first integration
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 600 }}>
          The app shell, theme, and tooling are in place. No prices, wallet balances, or market
          claims are shown until a trusted data source is configured.
        </Typography>
      </Box>
      <Typography className="c-hero-panel__symbol" aria-hidden="true">
        ₿
      </Typography>
    </Paper>
  );
}
