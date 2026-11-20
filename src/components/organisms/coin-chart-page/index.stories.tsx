import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CoinChartPage } from './index';

const meta = {
  title: 'Organisms/Coin Chart Page',
  component: CoinChartPage,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof CoinChartPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bitcoin: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/chart/BTCUSDT']}>
      <Routes>
        <Route path="/chart/:symbol" element={<CoinChartPage />} />
      </Routes>
    </MemoryRouter>
  )
};
