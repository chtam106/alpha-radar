import { Box, Container, Stack, Typography } from '@mui/material';
import { Link, NavLink } from 'react-router-dom';

export function GlobalHeader() {
  return (
    <Box component="header" className="o-global-header">
      <Container maxWidth="lg" className="o-global-header__inner">
        <Link to="/" className="o-global-header__brand">
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="o-global-header__logo"
          />
          <Typography component="span" variant="subtitle1" className="o-global-header__brand-name">
            Alpha Radar
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
            to="/watchlist"
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Watchlist
          </NavLink>
          <NavLink
            to="/hidden"
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Hidden
          </NavLink>
        </Stack>
      </Container>
    </Box>
  );
}
