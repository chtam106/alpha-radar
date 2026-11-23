import type { Meta, StoryObj } from '@storybook/react-vite';
import { WatchlistFeedback } from './index';

const meta = {
  title: 'Molecules/Watchlist Feedback',
  component: WatchlistFeedback,
  tags: ['autodocs']
} satisfies Meta<typeof WatchlistFeedback>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Added: Story = {
  args: { feedback: 'added', onClose: () => undefined }
};

export const Removed: Story = {
  args: { feedback: 'removed', onClose: () => undefined }
};

export const Error: Story = {
  args: { feedback: 'error', onClose: () => undefined }
};
