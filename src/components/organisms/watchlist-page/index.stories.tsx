import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { WatchlistPage } from './index';

const meta = {
  title: 'Organisms/Watchlist Page',
  component: WatchlistPage,
  tags: ['autodocs']
} satisfies Meta<typeof WatchlistPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>
  )
};
