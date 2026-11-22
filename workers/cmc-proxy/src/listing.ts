const CMC_LISTING_ENDPOINT = 'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing';
const LISTING_LIMIT = 10_000;
const TOKEN_UNLOCK_ENDPOINT = 'https://api.coinmarketcap.com/data-api/v3/token-unlock/listing';
const TOKEN_UNLOCK_PAGE_SIZE = 100;
const MAX_TOKEN_UNLOCK_PAGES = 30;
const REQUEST_HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

export interface CmcSupplyEntry {
  symbol: string;
  slug: string | null;
  name: string;
  tokenAddress: string | null;
  circulatingSupply: number;
  totalSupply: number;
  unlockedPercent: number | null;
}

interface TokenUnlockPage {
  totalCount: number;
  unlockedPercentById: Map<number, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toPositiveNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

async function fetchTokenUnlockPage(page: number): Promise<TokenUnlockPage> {
  const url = new URL(TOKEN_UNLOCK_ENDPOINT);
  url.searchParams.set('start', String(page));
  url.searchParams.set('limit', String(TOKEN_UNLOCK_PAGE_SIZE));

  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) {
    throw new Error(`CoinMarketCap token unlocks returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const list = Array.isArray(data.tokenUnlockList) ? data.tokenUnlockList : [];
  const unlockedPercentById = new Map<number, number>();
  for (const item of list) {
    if (
      isRecord(item) &&
      typeof item.cryptoId === 'number' &&
      typeof item.totalUnlockedPercentage === 'number' &&
      Number.isFinite(item.totalUnlockedPercentage)
    ) {
      unlockedPercentById.set(
        item.cryptoId,
        Math.min(Math.max(item.totalUnlockedPercentage, 0), 100)
      );
    }
  }

  return { totalCount: Number(data.totalCount) || 0, unlockedPercentById };
}

async function fetchTokenUnlockPercents(): Promise<Map<number, number>> {
  const firstPage = await fetchTokenUnlockPage(1);
  const pageCount = Math.min(
    Math.ceil(firstPage.totalCount / TOKEN_UNLOCK_PAGE_SIZE),
    MAX_TOKEN_UNLOCK_PAGES
  );
  const otherPages = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) =>
      fetchTokenUnlockPage(index + 2)
    )
  );

  return new Map(
    [firstPage, ...otherPages].flatMap(({ unlockedPercentById }) => [...unlockedPercentById])
  );
}

export async function fetchCmcSupplyListing(): Promise<CmcSupplyEntry[]> {
  const url = new URL(CMC_LISTING_ENDPOINT);
  url.searchParams.set('start', '1');
  url.searchParams.set('limit', String(LISTING_LIMIT));
  url.searchParams.set('convert', 'USD');
  url.searchParams.set('aux', 'platform,circulating_supply,total_supply');

  const [response, unlockedPercentById] = await Promise.all([
    fetch(url, { headers: REQUEST_HEADERS }),
    fetchTokenUnlockPercents().catch(() => new Map<number, number>())
  ]);
  if (!response.ok) {
    throw new Error(`CoinMarketCap returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.cryptoCurrencyList)
  ) {
    throw new Error('CoinMarketCap returned an unexpected listing response.');
  }

  return payload.data.cryptoCurrencyList.flatMap((coin: unknown): CmcSupplyEntry[] => {
    if (!isRecord(coin) || typeof coin.symbol !== 'string' || typeof coin.name !== 'string') {
      return [];
    }

    const totalSupply = toPositiveNumber(coin.totalSupply);
    const circulatingSupply =
      toPositiveNumber(coin.circulatingSupply) ||
      toPositiveNumber(coin.selfReportedCirculatingSupply);
    if (totalSupply === 0 || circulatingSupply === 0) {
      return [];
    }

    const tokenAddress =
      isRecord(coin.platform) && typeof coin.platform.token_address === 'string'
        ? coin.platform.token_address.toLowerCase()
        : null;
    const unlockedPercent =
      typeof coin.id === 'number' ? (unlockedPercentById.get(coin.id) ?? null) : null;
    return [
      {
        symbol: coin.symbol,
        slug: typeof coin.slug === 'string' ? coin.slug : null,
        name: coin.name,
        tokenAddress,
        circulatingSupply,
        totalSupply,
        unlockedPercent
      }
    ];
  });
}
