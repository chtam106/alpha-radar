import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroPanel } from './index';

const meta = {
  title: 'Molecules/Hero Panel',
  component: HeroPanel,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
} satisfies Meta<typeof HeroPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
