import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { GlobalHeader } from './index';

const meta = {
  title: 'Organisms/Global Header',
  component: GlobalHeader,
  tags: ['autodocs']
} satisfies Meta<typeof GlobalHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MemoryRouter>
      <GlobalHeader />
    </MemoryRouter>
  )
};
