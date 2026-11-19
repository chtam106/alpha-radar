import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopBar } from './index';

const meta = {
  title: 'Molecules/Top Bar',
  component: TopBar,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
