import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ENABLE_CHART_PAGE } from '@/config/feature-flags';

export interface TokenContextMenuItem {
  symbol: string;
  iconUrl: string | null;
  futuresSymbol: string;
  coinMarketCapUrl: string;
  isWatchlisted: boolean;
  isHidden: boolean;
}

interface TokenContextMenuProps {
  token: TokenContextMenuItem | null;
  anchorPosition: { top: number; left: number } | null;
  openChartInNewTab?: boolean;
  showWatchlistAction?: boolean;
  showHiddenAction?: boolean;
  onClose: () => void;
  onToggleWatchlist?: () => void;
  onToggleHidden?: () => void;
  onContextMenuOverlay: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export function TokenContextMenu({
  token,
  anchorPosition,
  openChartInNewTab = false,
  showWatchlistAction = true,
  showHiddenAction = true,
  onClose,
  onToggleWatchlist,
  onToggleHidden,
  onContextMenuOverlay
}: TokenContextMenuProps) {
  return (
    <Menu
      open={token !== null && anchorPosition !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      slotProps={{
        paper: {
          className: 'm-token-context-menu__paper',
          onContextMenu: onContextMenuOverlay
        },
        backdrop: {
          className: 'm-token-context-menu__backdrop',
          onContextMenu: onContextMenuOverlay
        },
        list: { className: 'm-token-context-menu__list' }
      }}
      anchorPosition={anchorPosition ?? undefined}
    >
      {token && (
        <>
          <Box className="m-token-context-menu__heading">
            <Typography className="m-token-context-menu__label">Token</Typography>
            <Box className="m-token-context-menu__identity">
              <Box component="span" className="m-token-context-menu__token-icon" aria-hidden="true">
                {token.iconUrl ? (
                  <img src={token.iconUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  token.symbol.slice(0, 1)
                )}
              </Box>
              <Typography className="m-token-context-menu__symbol">{token.symbol}</Typography>
            </Box>
          </Box>
          {showWatchlistAction && onToggleWatchlist && (
            <MenuItem
              className="m-token-context-menu__item"
              onClick={() => {
                onToggleWatchlist();
                onClose();
              }}
            >
              <Box component="span" className="m-token-context-menu__icon-wrap">
                {token.isWatchlisted ? (
                  <StarRoundedIcon className="m-token-context-menu__icon" />
                ) : (
                  <StarBorderRoundedIcon className="m-token-context-menu__icon" />
                )}
              </Box>
              <Typography component="span" className="m-token-context-menu__action">
                {token.isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              </Typography>
            </MenuItem>
          )}
          {showHiddenAction && onToggleHidden && (
            <MenuItem
              className="m-token-context-menu__item"
              onClick={() => {
                onToggleHidden();
                onClose();
              }}
            >
              <Box component="span" className="m-token-context-menu__icon-wrap">
                {token.isHidden ? (
                  <VisibilityRoundedIcon className="m-token-context-menu__icon" />
                ) : (
                  <VisibilityOffRoundedIcon className="m-token-context-menu__icon" />
                )}
              </Box>
              <Typography component="span" className="m-token-context-menu__action">
                {token.isHidden ? 'Show on home' : 'Hide from home'}
              </Typography>
            </MenuItem>
          )}
          {ENABLE_CHART_PAGE && (
            <MenuItem
              component={Link}
              to={`/chart/${encodeURIComponent(token.futuresSymbol)}`}
              target={
                openChartInNewTab && window.matchMedia('(min-width: 768px)').matches
                  ? '_blank'
                  : undefined
              }
              rel="noopener noreferrer"
              className="m-token-context-menu__item"
              onClick={onClose}
            >
              <Box component="span" className="m-token-context-menu__icon-wrap">
                <ShowChartRoundedIcon className="m-token-context-menu__icon" />
              </Box>
              <Typography component="span" className="m-token-context-menu__action">
                Open chart
              </Typography>
            </MenuItem>
          )}
          <Box className="m-token-context-menu__section">Trading &amp; Research</Box>
          <MenuItem
            component="a"
            href={`https://www.binance.com/en/futures/${encodeURIComponent(token.futuresSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="m-token-context-menu__item"
            onClick={onClose}
          >
            <Box className="m-token-context-menu__icon-wrap m-token-context-menu__link-icon-wrap">
              <Box
                component="img"
                src="https://bin.bnbstatic.com/static/images/common/favicon.ico"
                alt=""
                className="m-token-context-menu__link-logo"
              />
            </Box>
            <Typography component="span" className="m-token-context-menu__action">
              Binance Futures
            </Typography>
            <OpenInNewRoundedIcon className="m-token-context-menu__external-icon" />
          </MenuItem>
          <MenuItem
            component="a"
            href={`https://www.coinglass.com/tv/Binance_${encodeURIComponent(token.futuresSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="m-token-context-menu__item"
            onClick={onClose}
          >
            <Box className="m-token-context-menu__icon-wrap m-token-context-menu__link-icon-wrap">
              <Box
                component="img"
                src="https://cdn.coinglasscdn.com/static/icon_200.png"
                alt=""
                className="m-token-context-menu__link-logo"
              />
            </Box>
            <Typography component="span" className="m-token-context-menu__action">
              CoinGlass
            </Typography>
            <OpenInNewRoundedIcon className="m-token-context-menu__external-icon" />
          </MenuItem>
          <MenuItem
            component="a"
            href={token.coinMarketCapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="m-token-context-menu__item"
            onClick={onClose}
          >
            <Box className="m-token-context-menu__icon-wrap m-token-context-menu__link-icon-wrap">
              <Box
                component="img"
                src="https://coinmarketcap.com/favicon.ico"
                alt=""
                className="m-token-context-menu__link-logo"
              />
            </Box>
            <Typography component="span" className="m-token-context-menu__action">
              CoinMarketCap
            </Typography>
            <OpenInNewRoundedIcon className="m-token-context-menu__external-icon" />
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
