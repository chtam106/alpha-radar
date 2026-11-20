import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './index';

const meta = {
  title: 'Organisms/Home Page',
  component: HomePage,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
};
