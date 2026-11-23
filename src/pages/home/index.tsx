import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Slider,
  Stack,
  Typography
} from '@mui/material';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  startTransition,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useWatchlist } from '@/hooks/use-watchlist';
import { fetchBscAlphaTokens, type BscAlphaToken } from '@/services/binance-alpha';
import { getCoinMarketCapUrl } from '@/services/coinmarketcap';
import { TokenContextMenu } from '@/components/molecules/token-context-menu';
import {
  TokenTableSortControl,
  TokenTable,
  type TokenTableRowData,
  type TokenTableSortDirection,
  type TokenTableSortField
} from '@/components/organisms/token-table';

type SortPreference = {
  field: TokenTableSortField;
  direction: TokenTableSortDirection;
};

const SORT_PREFERENCE_STORAGE_KEY = 'crypto-dashboard:sort-preference';
const FILTER_PREFERENCE_STORAGE_KEY = 'crypto-dashboard:filter-preference';
const DEFAULT_SORT_PREFERENCE: SortPreference = { field: 'marketCap', direction: 'asc' };
const TOTAL_SUPPLY_FILTERS = [
  { label: '1B', value: 1_000_000_000 },
  { label: '10B', value: 10_000_000_000 }
] as const;
type TotalSupplyFilter = (typeof TOTAL_SUPPLY_FILTERS)[number]['value'];
const MIN_UNLOCK_FILTERS = [0, 5, 10, 15, 20, 25, 30] as const;
type MinUnlockFilter = (typeof MIN_UNLOCK_FILTERS)[number];
const DEFAULT_MIN_UNLOCK_FILTER: MinUnlockFilter = 0;
const UNLOCK_FILTERS = [5, 10, 15, 20, 25, 30, 35] as const;
type UnlockFilter = (typeof UNLOCK_FILTERS)[number];
const DEFAULT_UNLOCK_FILTER: UnlockFilter = 35;
type FilterPreference = {
  totalSupplyFilters: TotalSupplyFilter[];
  minUnlockFilter: MinUnlockFilter;
  maxUnlockFilter: UnlockFilter;
};
const DEFAULT_FILTER_PREFERENCE: FilterPreference = {
  totalSupplyFilters: [],
  minUnlockFilter: DEFAULT_MIN_UNLOCK_FILTER,
  maxUnlockFilter: DEFAULT_UNLOCK_FILTER
};

type TokenContextMenuState = { token: BscAlphaToken; mouseX: number; mouseY: number };

function isSortField(value: string | undefined): value is TokenTableSortField {
  return value === 'marketCap' || value === 'fdv' || value === 'unlockedPercent';
}

function isSortDirection(value: string | undefined): value is TokenTableSortDirection {
  return value === 'asc' || value === 'desc';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTotalSupplyFilter(value: unknown): value is TotalSupplyFilter {
  return TOTAL_SUPPLY_FILTERS.some(({ value: supply }) => supply === value);
}

function isMinUnlockFilter(value: unknown): value is MinUnlockFilter {
  return MIN_UNLOCK_FILTERS.some((filter) => filter === value);
}

function isUnlockFilter(value: unknown): value is UnlockFilter {
  return UNLOCK_FILTERS.some((filter) => filter === value);
}

function parseFilterPreference(value: string | null): FilterPreference {
  if (!value) {
    return DEFAULT_FILTER_PREFERENCE;
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch (error) {
    console.error('Unable to parse the saved filter preferences.', error);
    return DEFAULT_FILTER_PREFERENCE;
  }

  if (!isRecord(parsedValue)) {
    console.error('The saved filter preferences have an unexpected format.');
    return DEFAULT_FILTER_PREFERENCE;
  }

  const rawTotalSupplyFilters = parsedValue.totalSupplyFilters;
  const totalSupplyFilters = Array.isArray(rawTotalSupplyFilters)
    ? rawTotalSupplyFilters.filter(isTotalSupplyFilter)
    : [];
  const minUnlockFilter = parsedValue.minUnlockFilter;
  const maxUnlockFilter = parsedValue.maxUnlockFilter;
  if (
    !Array.isArray(rawTotalSupplyFilters) ||
    totalSupplyFilters.length !== rawTotalSupplyFilters.length ||
    !isMinUnlockFilter(minUnlockFilter) ||
    !isUnlockFilter(maxUnlockFilter) ||
    minUnlockFilter > maxUnlockFilter
  ) {
    console.error('The saved filter preferences have an unexpected format.');
    return DEFAULT_FILTER_PREFERENCE;
  }

  return {
    totalSupplyFilters: Array.from(new Set(totalSupplyFilters)),
    minUnlockFilter,
    maxUnlockFilter
  };
}

function readFilterPreference(): FilterPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTER_PREFERENCE;
  }

  try {
    return parseFilterPreference(window.localStorage.getItem(FILTER_PREFERENCE_STORAGE_KEY));
  } catch (error) {
    console.error('Unable to access the saved filter preferences.', error);
    return DEFAULT_FILTER_PREFERENCE;
  }
}

function readSortPreference(): SortPreference {
  if (typeof window === 'undefined') {
    return DEFAULT_SORT_PREFERENCE;
  }

  const savedPreference = window.localStorage.getItem(SORT_PREFERENCE_STORAGE_KEY);
  if (!savedPreference) {
    return DEFAULT_SORT_PREFERENCE;
  }

  const [field, direction, ...extra] = savedPreference.split(':');
  if (extra.length === 0 && isSortField(field) && isSortDirection(direction)) {
    return { field, direction };
  }

  return DEFAULT_SORT_PREFERENCE;
}

function TotalSupplyFilter({
  value,
  onChange
}: {
  value: TotalSupplyFilter[];
  onChange: (value: TotalSupplyFilter[]) => void;
}) {
  const [draft, setDraft] = useState<TotalSupplyFilter[] | null>(null);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setDraft(null);
  }
  const selectedFilters = draft ?? value;

  function select(next: TotalSupplyFilter[]) {
    setDraft(next);
    startTransition(() => onChange(next));
  }

  return (
    <Box
      role="group"
      aria-label="Filter by total supply"
      className="p-crypto-dashboard__quick-filter"
    >
      <Typography className="p-crypto-dashboard__quick-filter-label">Total supply</Typography>
      <Box className="p-crypto-dashboard__quick-filter-options">
        <Chip
          label="All"
          clickable
          aria-pressed={selectedFilters.length === 0}
          variant={selectedFilters.length === 0 ? 'filled' : 'outlined'}
          color={selectedFilters.length === 0 ? 'primary' : 'default'}
          onClick={() => select([])}
          className="p-crypto-dashboard__quick-filter-chip"
        />
        {TOTAL_SUPPLY_FILTERS.map(({ label, value: supply }) => {
          const selected = selectedFilters.includes(supply);
          return (
            <Chip
              key={supply}
              label={label}
              clickable
              aria-pressed={selected}
              variant={selected ? 'filled' : 'outlined'}
              color={selected ? 'primary' : 'default'}
              onClick={() =>
                select(
                  selected
                    ? selectedFilters.filter((item) => item !== supply)
                    : [...selectedFilters, supply]
                )
              }
              className="p-crypto-dashboard__quick-filter-chip"
            />
          );
        })}
      </Box>
    </Box>
  );
}

function UnlockRangeSlider({
  minimum,
  maximum,
  onChange
}: {
  minimum: MinUnlockFilter;
  maximum: UnlockFilter;
  onChange: (minimum: MinUnlockFilter, maximum: UnlockFilter) => void;
}) {
  const [draft, setDraft] = useState<number[] | null>(null);
  const [previousRange, setPreviousRange] = useState([minimum, maximum]);
  if (previousRange[0] !== minimum || previousRange[1] !== maximum) {
    setPreviousRange([minimum, maximum]);
    setDraft(null);
  }
  const range = draft ?? [minimum, maximum];

  function commitRange(value: number[]) {
    const min = Math.min(30, Math.max(0, Math.round(value[0] / 5) * 5));
    const max = Math.min(35, Math.max(5, Math.round(value[1] / 5) * 5));
    if (isMinUnlockFilter(min) && isUnlockFilter(max)) {
      setDraft(min === minimum && max === maximum ? null : [min, max]);
      onChange(min, max);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const index = Number(event.target.dataset.index);
    if (index !== 0 && index !== 1) return;

    let value: number;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
      case 'PageUp':
        value = range[index] + 5;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'PageDown':
        value = range[index] - 5;
        break;
      case 'Home':
        value = index === 0 ? 0 : 5;
        break;
      case 'End':
        value = index === 0 ? 30 : 35;
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    const next = [...range];
    next[index] =
      index === 0
        ? Math.max(0, Math.min(value, 30, range[1]))
        : Math.min(35, Math.max(value, 5, range[0]));
    commitRange(next);
  }

  return (
    <Box className="p-crypto-dashboard__unlock-slider" onKeyDownCapture={handleKeyDown}>
      <Slider
        value={range}
        min={0}
        max={35}
        step={0.1}
        marks={[...MIN_UNLOCK_FILTERS, DEFAULT_UNLOCK_FILTER].map((value) => ({
          value,
          label: `${value}%`
        }))}
        slotProps={{
          markLabel: { className: 'p-crypto-dashboard__unlock-mark' },
          thumb: { className: 'p-crypto-dashboard__unlock-thumb' },
          track: { className: 'p-crypto-dashboard__unlock-track' }
        }}
        disableSwap
        getAriaLabel={(index) => (index === 0 ? 'Minimum unlock' : 'Maximum unlock')}
        getAriaValueText={(value) => `${value}%`}
        onChange={(_, value, activeThumb) => {
          if (Array.isArray(value)) {
            const next = [...value];
            if (activeThumb === 0) next[0] = Math.min(next[0], 30);
            if (activeThumb === 1) next[1] = Math.max(next[1], 5);
            setDraft(next);
          }
        }}
        onChangeCommitted={(_, value) => {
          if (Array.isArray(value)) commitRange(value);
        }}
      />
    </Box>
  );
}

export function HomePage() {
  const [tokens, setTokens] = useState<BscAlphaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortPreference, setSortPreference] = useState(readSortPreference);
  const [filterPreference, setFilterPreference] = useState(readFilterPreference);
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const [contextMenu, setContextMenu] = useState<TokenContextMenuState | null>(null);
  const { totalSupplyFilters, minUnlockFilter, maxUnlockFilter } = filterPreference;
  const filtersActive =
    totalSupplyFilters.length > 0 ||
    minUnlockFilter !== DEFAULT_MIN_UNLOCK_FILTER ||
    maxUnlockFilter !== DEFAULT_UNLOCK_FILTER;
  const { field: sortField, direction: sortDirection } = sortPreference;
  useEffect(() => {
    const controller = new AbortController();

    async function loadTokens() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchBscAlphaTokens(controller.signal);
        setTokens(result);
        setLastUpdated(new Date());
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unable to load Binance Alpha tokens.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTokens();
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    window.localStorage.setItem(
      SORT_PREFERENCE_STORAGE_KEY,
      `${sortPreference.field}:${sortPreference.direction}`
    );
  }, [sortPreference]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_PREFERENCE_STORAGE_KEY, JSON.stringify(filterPreference));
    } catch (error) {
      console.error('Unable to save the filter preferences.', error);
    }
  }, [filterPreference]);

  const filteredTokens = useMemo(
    () =>
      tokens.filter(
        (token) =>
          token.unlockedPercent >= minUnlockFilter &&
          token.unlockedPercent <= maxUnlockFilter &&
          (totalSupplyFilters.length === 0 ||
            totalSupplyFilters.some((supply) => token.totalSupply === supply))
      ),
    [tokens, totalSupplyFilters, minUnlockFilter, maxUnlockFilter]
  );

  const sortedTokens = useMemo(
    () =>
      [...filteredTokens].sort((first, second) => {
        const firstValue = first[sortField];
        const secondValue = second[sortField];
        if (firstValue === null) {
          return secondValue === null ? 0 : 1;
        }
        if (secondValue === null) {
          return -1;
        }
        return sortDirection === 'asc' ? firstValue - secondValue : secondValue - firstValue;
      }),
    [filteredTokens, sortDirection, sortField]
  );

  const tableRows = useMemo<TokenTableRowData[]>(
    () =>
      sortedTokens.map((token) => ({
        id: token.tokenId,
        futuresSymbol: token.futuresSymbol,
        symbol: token.symbol,
        liquidity: token.liquidity,
        iconUrl: token.iconUrl,
        price: token.price,
        marketCap: token.marketCap,
        fdv: token.fdv,
        totalSupply: token.totalSupply,
        unlockedPercent: token.unlockedPercent,
        circulatingSupply: token.circulatingSupply
      })),
    [sortedTokens]
  );

  function resetFilters() {
    setFilterPreference({ ...DEFAULT_FILTER_PREFERENCE });
  }

  function openTokenMenu(futuresSymbol: string, mouseX: number, mouseY: number) {
    const token = sortedTokens.find((candidate) => candidate.futuresSymbol === futuresSymbol);
    if (token) {
      setContextMenu({ token, mouseX, mouseY });
    }
  }

  function handleContextMenuOnOverlay(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const paper = document.querySelector<HTMLElement>('.m-token-context-menu__paper');
    const backdrop = document.querySelector<HTMLElement>('.m-token-context-menu__backdrop');
    const paperPointerEvents = paper?.style.pointerEvents;
    const backdropPointerEvents = backdrop?.style.pointerEvents;
    const row = (() => {
      try {
        if (paper) {
          paper.style.pointerEvents = 'none';
        }
        if (backdrop) {
          backdrop.style.pointerEvents = 'none';
        }
        return (
          document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('[data-futures-symbol]') ?? null
        );
      } finally {
        if (paper) {
          paper.style.pointerEvents = paperPointerEvents ?? '';
        }
        if (backdrop) {
          backdrop.style.pointerEvents = backdropPointerEvents ?? '';
        }
      }
    })();

    const symbol = row?.dataset.futuresSymbol;
    const token = sortedTokens.find((candidate) => candidate.futuresSymbol === symbol);
    if (token && token.futuresSymbol !== contextMenu?.token.futuresSymbol) {
      openTokenMenu(token.futuresSymbol, event.clientX, event.clientY);
    } else if (!token) {
      setContextMenu(null);
    }
  }

  function handleSort(field: TokenTableSortField) {
    setSortPreference((current) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'unlockedPercent' ? 'asc' : 'desc' }
    );
  }

  return (
    <Container maxWidth="lg" className="p-crypto-dashboard">
      <Box component="main" className="p-crypto-dashboard__main">
        <Stack spacing={3}>
          <Box className="p-crypto-dashboard__intro">
            <Box className="p-crypto-dashboard__intro-copy">
              <Typography variant="h1" sx={{ mt: 0.5, fontSize: { xs: 34, sm: 46 } }}>
                Binance Alpha Futures Radar
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
                className="p-crypto-dashboard__description"
              >
                Built to find coins that have multiplied in value, like $RAV, $LAB, and $BTW. They
                share a profile: Binance Alpha on BSC, listed on Futures but not Spot, with a total
                supply of 1B or 10B. Speculative research only; scams and rug pulls are possible.
              </Typography>
            </Box>
          </Box>

          <Box className="p-crypto-dashboard__list-heading">
            <Box className="p-crypto-dashboard__filters">
              <TotalSupplyFilter
                value={totalSupplyFilters}
                onChange={(value) =>
                  setFilterPreference((current) => ({ ...current, totalSupplyFilters: value }))
                }
              />
              <Box
                role="group"
                aria-label="Filter by unlock range"
                className="p-crypto-dashboard__quick-filter p-crypto-dashboard__unlock-filter"
              >
                <Typography className="p-crypto-dashboard__quick-filter-label">Unlock</Typography>
                <Box className="p-crypto-dashboard__unlock-range">
                  <UnlockRangeSlider
                    minimum={minUnlockFilter}
                    maximum={maxUnlockFilter}
                    onChange={(minimum, maximum) => {
                      startTransition(() => {
                        setFilterPreference((current) => ({
                          ...current,
                          minUnlockFilter: minimum,
                          maxUnlockFilter: maximum
                        }));
                      });
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Box className="p-crypto-dashboard__list-status">
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                className="p-crypto-dashboard__list-status-meta"
              >
                {tokens.length > 0 && (
                  <Typography variant="body2" className="p-crypto-dashboard__list-meta">
                    {filtersActive
                      ? `${sortedTokens.length} of ${tokens.length} coins match`
                      : `${tokens.length} coins match`}
                  </Typography>
                )}
                {lastUpdated && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="p-crypto-dashboard__list-meta"
                  >
                    Updated{' '}
                    {lastUpdated.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                )}
                {error && tokens.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Count unavailable
                  </Typography>
                )}
                {loading && tokens.length > 0 && (
                  <CircularProgress size={20} aria-label="Refreshing token list" />
                )}
              </Stack>
              <Box className="p-crypto-dashboard__list-actions">
                <Button
                  variant="outlined"
                  startIcon={<FilterAltOffRoundedIcon />}
                  onClick={resetFilters}
                  disabled={!filtersActive}
                  className="p-crypto-dashboard__reset-filters"
                >
                  Reset filters
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={loading}
                  className="p-crypto-dashboard__refresh"
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Box>

          <Box className="p-crypto-dashboard__list-panel">
            {error && (
              <Alert
                severity={tokens.length > 0 ? 'warning' : 'error'}
                className="p-crypto-dashboard__alert"
              >
                {error}
              </Alert>
            )}

            {loading && tokens.length === 0 ? (
              <Box className="p-crypto-dashboard__state">
                <CircularProgress size={28} />
                <Typography color="text.secondary">Loading Binance Alpha tokens…</Typography>
              </Box>
            ) : sortedTokens.length > 0 ? (
              <>
                <TokenTableSortControl
                  sort={{ field: sortField, direction: sortDirection, onChange: handleSort }}
                />
                <TokenTable
                  ariaLabel="Binance Alpha BSC tokens listed in futures but not spot, with unlock of 35 percent or less"
                  rows={tableRows}
                  sort={{ field: sortField, direction: sortDirection, onChange: handleSort }}
                  onOpenMenu={openTokenMenu}
                />
              </>
            ) : tokens.length > 0 ? (
              <Box className="p-crypto-dashboard__state">
                <Typography variant="subtitle1">No matching tokens found</Typography>
                <Typography color="text.secondary">
                  No tokens match the selected filters.
                </Typography>
              </Box>
            ) : error ? null : (
              <Box className="p-crypto-dashboard__state">
                <Typography variant="subtitle1">No matching tokens found</Typography>
                <Typography color="text.secondary">
                  No active BSC Alpha tokens currently meet the 35% unlock threshold.
                </Typography>
              </Box>
            )}
          </Box>
          <TokenContextMenu
            token={
              contextMenu
                ? {
                    symbol: contextMenu.token.symbol,
                    iconUrl: contextMenu.token.iconUrl,
                    futuresSymbol: contextMenu.token.futuresSymbol,
                    coinMarketCapUrl: getCoinMarketCapUrl(contextMenu.token),
                    isWatchlisted: isWatchlisted(contextMenu.token.futuresSymbol)
                  }
                : null
            }
            anchorPosition={
              contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null
            }
            openChartInNewTab
            onClose={() => setContextMenu(null)}
            onToggleWatchlist={() => {
              if (contextMenu) {
                toggleWatchlist(contextMenu.token.futuresSymbol);
              }
            }}
            onContextMenuOverlay={handleContextMenuOnOverlay}
          />
        </Stack>
      </Box>
    </Container>
  );
}
