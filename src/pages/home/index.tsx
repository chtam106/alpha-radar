import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function HomePage() {
  return (
    <Container maxWidth="lg" className="p-home-page">
      <Box component="main" className="p-home-page__main">
        <Stack spacing={4}>
          <Box className="p-home-page__intro">
            <Typography variant="overline" color="primary">
              CRYPTO DESK
            </Typography>
            <Typography variant="h1" sx={{ mt: 1, fontSize: { xs: 34, sm: 46 } }}>
              Research workspace
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              A home for crypto research tools and market dashboards.
            </Typography>
          </Box>

          <Paper component="section" elevation={0} className="p-home-page__dashboard-card">
            <Box>
              <Typography variant="h2" sx={{ fontSize: 24 }}>
                High-Risk Alpha Radar
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Review Binance Alpha tokens on BNB Smart Chain that match the current filters.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/alpha-radar"
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
            >
              Open dashboard
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}
