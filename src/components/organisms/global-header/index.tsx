import { Box, Container, Stack, Typography } from '@mui/material';
import { Link, NavLink } from 'react-router-dom';
import { useHiddenCoins } from '@/hooks/use-hidden-coins';
import { useWatchlist } from '@/hooks/use-watchlist';

function NavCount({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }

  return (
    <Box component="span" className="o-global-header__count" aria-hidden="true">
      {count > 99 ? '99+' : count}
    </Box>
  );
}

function getNavLabel(label: string, count: number): string | undefined {
  if (count === 0) {
    return undefined;
  }
  return `${label} (${count === 1 ? '1 coin' : `${count} coins`})`;
}

export function GlobalHeader() {
  const { watchlist } = useWatchlist();
  const { hiddenCoins } = useHiddenCoins();

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
            aria-label={getNavLabel('Watchlist', watchlist.length)}
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Watchlist
            <NavCount count={watchlist.length} />
          </NavLink>
          <NavLink
            to="/hidden"
            aria-label={getNavLabel('Hidden', hiddenCoins.length)}
            className={({ isActive }) => `o-global-header__link${isActive ? ' is-active' : ''}`}
          >
            Hidden
            <NavCount count={hiddenCoins.length} />
          </NavLink>
        </Stack>
      </Container>
    </Box>
  );
}
