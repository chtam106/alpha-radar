import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataSourceStatus } from './index';

const meta = {
  title: 'Atoms/Data Source Status',
  component: DataSourceStatus,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof DataSourceStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
