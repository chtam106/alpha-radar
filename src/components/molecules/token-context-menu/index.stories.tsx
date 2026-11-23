import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { TokenContextMenu } from './index';

const meta = {
  title: 'Molecules/Token Context Menu',
  component: TokenContextMenu,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TokenContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    token: {
      symbol: 'BTC',
      iconUrl: null,
      futuresSymbol: 'BTCUSDT',
      coinMarketCapUrl: 'https://coinmarketcap.com/currencies/bitcoin/',
      isWatchlisted: true
    },
    anchorPosition: { top: 120, left: 120 },
    onClose: () => undefined,
    onToggleWatchlist: () => undefined,
    onContextMenuOverlay: () => undefined
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    )
  ]
};
