import { Box, Container, Stack, Typography } from '@mui/material';
import { Link, NavLink } from 'react-router-dom';

export function GlobalHeader() {
  return (
    <Box component="header" className="o-global-header">
      <Container maxWidth="lg" className="o-global-header__inner">
        <Link to="/" className="o-global-header__brand">
          <Typography component="span" variant="subtitle1" className="o-global-header__brand-name">
            Crypto Desk
          </Typography>
        </Link>

        <Stack
          component="nav"
          direction="row"
          spacing={1}
          aria-label="Main navigation"
          className="o-global-header__nav"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/alpha-radar"
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            High-Risk Alpha Radar
          </NavLink>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Watchlist
          </NavLink>
        </Stack>
      </Container>
    </Box>
  );
}
