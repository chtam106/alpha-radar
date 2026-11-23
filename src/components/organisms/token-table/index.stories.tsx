import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenTable } from './index';

const meta = {
  title: 'Organisms/Token Table',
  component: TokenTable,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TokenTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ariaLabel: 'Sample token table',
    rows: [
      {
        id: 'bitcoin',
        futuresSymbol: 'BTCUSDT',
        symbol: 'BTC',
        name: 'Bitcoin',
        iconUrl: null,
        price: 65000,
        marketCap: 1_280_000_000_000,
        fdv: 1_365_000_000_000,
        totalSupply: 21_000_000,
        unlockedPercent: 94.2,
        circulatingSupply: 19_700_000
      }
    ],
    onOpenMenu: () => undefined
  }
};
