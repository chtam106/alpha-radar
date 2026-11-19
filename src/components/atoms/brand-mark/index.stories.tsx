import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandMark } from './index';

const meta = {
  title: 'Atoms/Brand Mark',
  component: BrandMark,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof BrandMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
